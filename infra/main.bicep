@description('Environment name - dev / staging / prod')
param env string = 'dev'

@description('Azure region')
param location string = resourceGroup().location

@description('Container image tag to deploy')
param imageTag string = 'latest'

@secure()
param dbAdminPassword string

@secure()
param secretKey string

var prefix = 'predictiveops-${env}'
var acrName = replace('${prefix}acr', '-', '')

// ─── Container Registry ───────────────────────────────────────────────────────
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: false }
}

// ─── PostgreSQL Flexible Server ───────────────────────────────────────────────
resource pg 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: '${prefix}-pg'
  location: location
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  properties: {
    administratorLogin: 'pgadmin'
    administratorLoginPassword: dbAdminPassword
    storage: { storageSizeGB: 32 }
    version: '16'
    backup: { backupRetentionDays: 7, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
  }
}

resource pgDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: pg
  name: 'assetrisk'
}

// ─── Key Vault ────────────────────────────────────────────────────────────────
resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${prefix}-kv'
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    softDeleteRetentionInDays: 7
  }
}

resource kvSecretKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'secret-key'
  properties: { value: secretKey }
}

resource kvDbPassword 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'db-admin-password'
  properties: { value: dbAdminPassword }
}

// ─── Log Analytics + Application Insights ─────────────────────────────────────
resource law 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-law'
  location: location
  properties: { sku: { name: 'PerGB2018' }, retentionInDays: 30 }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${prefix}-ai'
  location: location
  kind: 'web'
  properties: { Application_Type: 'web', WorkspaceResourceId: law.id }
}

// ─── Container Apps Environment ───────────────────────────────────────────────
resource cae 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${prefix}-cae'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: law.properties.customerId
        sharedKey: law.listKeys().primarySharedKey
      }
    }
  }
}

// ─── Backend Container App ────────────────────────────────────────────────────
var dbUrl = 'postgresql://pgadmin:${dbAdminPassword}@${pg.properties.fullyQualifiedDomainName}:5432/assetrisk?sslmode=require'

resource backendApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${prefix}-backend'
  location: location
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      ingress: { external: true, targetPort: 8000 }
      registries: [{ server: acr.properties.loginServer, identity: 'system' }]
    }
    template: {
      containers: [
        {
          name: 'backend'
          image: '${acr.properties.loginServer}/backend:${imageTag}'
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'DATABASE_URL', value: dbUrl }
            { name: 'SECRET_KEY', secretRef: 'secret-key' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 3 }
    }
  }
}

// ─── Inference Job ────────────────────────────────────────────────────────────
resource inferenceJob 'Microsoft.App/jobs@2024-03-01' = {
  name: '${prefix}-inference'
  location: location
  properties: {
    environmentId: cae.id
    configuration: {
      triggerType: 'Schedule'
      scheduleTriggerConfig: { cronExpression: '0 * * * *', parallelism: 1, replicaCompletionCount: 1 }
      registries: [{ server: acr.properties.loginServer, identity: 'system' }]
    }
    template: {
      containers: [
        {
          name: 'inference'
          image: '${acr.properties.loginServer}/backend:${imageTag}'
          resources: { cpu: json('0.5'), memory: '1Gi' }
          command: ['python', '-m', 'jobs.run_inference']
          env: [{ name: 'DATABASE_URL', value: dbUrl }]
        }
      ]
    }
  }
}

output backendUrl string = 'https://${backendApp.properties.configuration.ingress.fqdn}'
output acrLoginServer string = acr.properties.loginServer
