'use client';

import { useEffect } from 'react';

const PAGE_SIZE = 10;
const CONTAINER_SELECTOR = [
  '.jobList',
  '.providerJobList',
  '.c3RequestList',
  '.adminUserList',
  '.cardList',
  '.cardsList',
].join(',');

const CARD_SELECTOR = [
  '.jobCard',
  '.providerJobCard',
  '.c3RequestCard',
  '.adminUserCard',
  '.card',
].join(',');

type PaginationState = { page: number; controls: HTMLDivElement | null };

function directCards(container: Element) {
  return Array.from(container.children).filter((child) => child.matches(CARD_SELECTOR)) as HTMLElement[];
}

function makeButton(label: string, onClick: () => void) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.style.minHeight = '44px';
  button.style.padding = '10px 18px';
  button.style.borderRadius = '12px';
  button.style.border = '1px solid var(--border, #d7deea)';
  button.style.background = 'var(--surface, #fff)';
  button.style.color = 'var(--text, #172033)';
  button.style.fontWeight = '700';
  button.style.cursor = 'pointer';
  button.addEventListener('click', onClick);
  return button;
}

export default function GlobalCardPagination() {
  useEffect(() => {
    const state = new WeakMap<Element, PaginationState>();
    let scheduled = false;

    const render = (container: Element) => {
      const cards = directCards(container);
      let current = state.get(container) || { page: 1, controls: null };
      const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
      current.page = Math.min(current.page, totalPages);

      cards.forEach((card, index) => {
        const start = (current.page - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        card.hidden = index < start || index >= end;
      });

      if (cards.length <= PAGE_SIZE) {
        current.controls?.remove();
        current.controls = null;
        current.page = 1;
        state.set(container, current);
        return;
      }

      current.controls?.remove();
      const controls = document.createElement('div');
      controls.setAttribute('data-global-card-pagination', 'true');
      controls.style.display = 'flex';
      controls.style.alignItems = 'center';
      controls.style.justifyContent = 'space-between';
      controls.style.gap = '12px';
      controls.style.marginTop = '18px';
      controls.style.width = '100%';

      const previous = makeButton('Previous', () => {
        const s = state.get(container);
        if (!s || s.page <= 1) return;
        s.page -= 1;
        state.set(container, s);
        render(container);
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      previous.disabled = current.page === 1;
      previous.style.opacity = previous.disabled ? '0.45' : '1';
      previous.style.cursor = previous.disabled ? 'default' : 'pointer';

      const pageInfo = document.createElement('span');
      pageInfo.textContent = `Page ${current.page} of ${totalPages}`;
      pageInfo.style.fontSize = '14px';
      pageInfo.style.fontWeight = '700';
      pageInfo.style.color = 'var(--muted, #687386)';
      pageInfo.style.textAlign = 'center';
      pageInfo.style.flex = '1';

      const next = makeButton('Next', () => {
        const s = state.get(container);
        if (!s || s.page >= totalPages) return;
        s.page += 1;
        state.set(container, s);
        render(container);
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      next.disabled = current.page === totalPages;
      next.style.opacity = next.disabled ? '0.45' : '1';
      next.style.cursor = next.disabled ? 'default' : 'pointer';

      controls.append(previous, pageInfo, next);
      container.insertAdjacentElement('afterend', controls);
      current.controls = controls;
      state.set(container, current);
    };

    const apply = () => {
      scheduled = false;
      document.querySelectorAll(CONTAINER_SELECTOR).forEach(render);
    };

    const scheduleApply = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(apply);
    };

    apply();
    const observer = new MutationObserver((mutations) => {
      if (mutations.every((mutation) => mutation.target instanceof Element && mutation.target.closest('[data-global-card-pagination="true"]'))) return;
      scheduleApply();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}

export { PAGE_SIZE as GLOBAL_CARD_PAGE_SIZE };
