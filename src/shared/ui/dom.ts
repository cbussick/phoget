/** HTML elements support focus; SVG/MathML active elements are not HTML controls. */
export function isHtmlElement(element: Element | null): element is HTMLElement {
  return element !== null && element.namespaceURI === "http://www.w3.org/1999/xhtml";
}
