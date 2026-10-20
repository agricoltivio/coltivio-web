import {
  MDXEditor,
  realmPlugin,
  addImportVisitor$,
  type MdastImportVisitor,
} from "@mdxeditor/editor";
import {
  $createParagraphNode,
  $createTextNode,
  $isElementNode,
  $isRootNode,
} from "lexical";
import type { ComponentProps } from "react";

// Bodies come from other users, so raw HTML must never reach the DOM.
// With HTML processing on, MDXEditor turns <details ontoggle="..."> into a
// live element with every attribute copied verbatim. With it off, commonmark
// html nodes reappear and the image plugin would parse <img ...> through
// innerHTML. This visitor claims every html node first and shows it as text.
const htmlAsTextVisitor: MdastImportVisitor<{ type: "html"; value: string }> = {
  testNode: "html",
  priority: 1,
  visitNode({ mdastNode, lexicalParent }) {
    const text = $createTextNode(mdastNode.value);
    if ($isRootNode(lexicalParent)) {
      lexicalParent.append($createParagraphNode().append(text));
    } else if ($isElementNode(lexicalParent)) {
      lexicalParent.append(text);
    }
  },
};

const htmlAsTextPlugin = realmPlugin({
  init(realm) {
    realm.pub(addImportVisitor$, htmlAsTextVisitor);
  },
});

type MarkdownEditorProps = Omit<
  ComponentProps<typeof MDXEditor>,
  "suppressHtmlProcessing"
>;

/** MDXEditor with user-supplied HTML neutralised. Use this instead of MDXEditor. */
export function MarkdownEditor({ plugins = [], ...props }: MarkdownEditorProps) {
  return (
    <MDXEditor
      {...props}
      suppressHtmlProcessing
      plugins={[...plugins, htmlAsTextPlugin()]}
    />
  );
}
