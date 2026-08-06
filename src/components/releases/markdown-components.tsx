import type { MarkdownComponents } from "@tanstack/markdown/react";
import type { ComponentPropsWithoutRef } from "react";
import { classifyNoteHref, isAllowedNoteImage } from "@/lib/note-links";

function NoteLink({ href, children, ...rest }: ComponentPropsWithoutRef<"a">) {
  const kind = classifyNoteHref(href);
  if (!kind) {
    return (
      <span data-blocked-href="" className="rr-notes__blocked">
        {children}
      </span>
    );
  }
  // `rest` first: a title from the markdown is fine, overriding href/target/rel
  // is not.
  return kind === "external" ? (
    <a {...rest} href={href} target="_blank" rel="noopener noreferrer nofollow ugc">
      {children}
    </a>
  ) : (
    <a {...rest} href={href}>
      {children}
    </a>
  );
}

function NoteImage({ src, alt, title }: ComponentPropsWithoutRef<"img">) {
  const source = typeof src === "string" ? src : "";
  if (isAllowedNoteImage(source)) {
    return (
      <img
        src={source}
        alt={alt ?? ""}
        title={title}
        loading="lazy"
        decoding="async"
        className="max-w-full rounded-control"
      />
    );
  }
  // Blocked: no network request, alt text preserved, and never <img src="">,
  // which would make the browser re-request the current document.
  const label = alt?.trim() || "image";
  return classifyNoteHref(source) === "external" ? (
    <a
      href={source}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      data-blocked-image=""
      className="rr-notes__blocked"
    >
      {label}
    </a>
  ) : (
    <span data-blocked-image="" className="rr-notes__blocked">
      {label}
    </span>
  );
}

/**
 * Upstream notes use arbitrary heading levels (some start at "#", others at
 * "###"), which breaks the page's heading outline (axe heading-order) no matter
 * how they are remapped. Render them as styled paragraphs instead — the page
 * outline stays valid and the visual hierarchy is preserved.
 */
function noteHeading(className: string) {
  return function NoteHeading(props: ComponentPropsWithoutRef<"p">) {
    return <p className={className} {...props} />;
  };
}

const NoteHeadingPrimary = noteHeading("text-base font-semibold text-fg");
const NoteHeadingSecondary = noteHeading("text-sm font-semibold text-fg");

/*
 * Code blocks and tables scroll horizontally, and axe's
 * scrollable-region-focusable requires a keyboard-reachable container for
 * exactly that — a scrollable region no one can reach by keyboard is a WCAG
 * 2.1.1 failure. jsx-a11y/no-noninteractive-tabindex disagrees on principle,
 * and here it is the one that is wrong: the legacy app shipped this same
 * tabIndex and measured zero axe violations.
 *
 * role="region" would satisfy both rules but promotes every code block to a
 * landmark, which wrecks the landmark structure on a page with 20 notes. So the
 * lint rule is suppressed narrowly instead.
 */
function NotePre(props: ComponentPropsWithoutRef<"pre">) {
  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- axe scrollable-region-focusable
  return <pre {...props} tabIndex={0} />;
}

function NoteTable({ children, ...rest }: ComponentPropsWithoutRef<"table">) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- axe scrollable-region-focusable
    <div className="rr-notes__scroll" tabIndex={0}>
      <table {...rest}>{children}</table>
    </div>
  );
}

export const NOTE_COMPONENTS: MarkdownComponents = {
  a: NoteLink,
  img: NoteImage,
  h1: NoteHeadingPrimary,
  h2: NoteHeadingPrimary,
  h3: NoteHeadingSecondary,
  h4: NoteHeadingSecondary,
  h5: NoteHeadingSecondary,
  h6: NoteHeadingSecondary,
  pre: NotePre,
  table: NoteTable,
};
