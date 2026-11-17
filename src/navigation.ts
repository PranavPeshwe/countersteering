export function buildIndex(container: HTMLElement, main: HTMLElement): void {
  const used = new Set<string>();
  const list = document.createElement('ul');
  for (const heading of main.querySelectorAll<HTMLHeadingElement>('h1,h2,h3,h4,h5,h6')) {
    const base = heading.id || heading.textContent?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
    let id = base;
    let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    heading.id = id;
    const item = document.createElement('li');
    item.className = `index-level-${heading.tagName.toLowerCase()}`;
    const link = document.createElement('a');
    link.href = `#${id}`;
    link.textContent = heading.textContent;
    link.addEventListener('click', event => {
      event.preventDefault();
      let ancestor = heading.parentElement;
      while (ancestor) {
        if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
        ancestor = ancestor.parentElement;
      }
      history.replaceState(null, '', `#${id}`);
      heading.scrollIntoView({ behavior: 'auto', block: 'start' });
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    });
    item.append(link);
    list.append(item);
  }
  container.replaceChildren(list);

  if (location.hash) {
    const initial = Array.from(list.querySelectorAll<HTMLAnchorElement>('a'))
      .find(link => link.hash === location.hash);
    initial?.click();
  }
}
