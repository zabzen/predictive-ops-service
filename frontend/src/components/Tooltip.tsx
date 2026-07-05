import { cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react";

interface Props {
  /** Trigger element - must accept a ref and forward extra props (a plain <button>/<span> works). */
  children: ReactElement;
  content: ReactNode;
  panelClassName?: string;
}

/**
 * Reusable hover/focus/click-triggered floating panel, built on @floating-ui/react.
 * Positioning (flip + shift) is automatic - no manual "align" prop needed, and no
 * clipping by ancestor overflow since the panel renders through a portal.
 *
 * This is the base primitive for other floating UI (menus, popovers, etc.) - those
 * should compose useFloating/useInteractions directly rather than wrapping this
 * component, since a menu's interaction set (click + arrow-key nav + role="menu")
 * differs from a tooltip's (hover/focus + role="tooltip").
 */
export function Tooltip({ children, content, panelClassName = "" }: Props) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, { move: false });
  const focus = useFocus(context);
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, click, dismiss, role]);

  if (!isValidElement(children)) return children;

  const trigger = cloneElement(children as ReactElement<Record<string, unknown>>, {
    ref: refs.setReference,
    ...getReferenceProps(),
  });

  return (
    <>
      {trigger}
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className={`z-50 w-64 rounded-lg border bg-white p-3 text-left text-sm font-normal normal-case tracking-normal text-slate-700 shadow-lg ${panelClassName}`}
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
