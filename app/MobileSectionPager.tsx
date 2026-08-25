'use client';

import { useEffect } from 'react';

const CONTENT_SELECTORS = [
  '[data-mobile-flow="true"]',
  '.c4Main > .c3Shell',
  'main > .c3Shell',
  'main > .adminContent',
  'main > .providerContent',
  'main > .settingsContent',
].join(',');

const SKIP_SELECTOR = [
  '.c3Wizard',
  '[role="dialog"]',
  '[data-global-card-pagination="true"]',
  '.jobList',
  '.providerJobList',
  '.c3RequestList',
  '.adminUserList',
].join(',');

type PagerState = {
  page: number;
  groups: HTMLElement[][];
  controls: HTMLDivElement | null;
  progress: HTMLDivElement | null;
};

function eligibleChildren(container: Element) {
  return Array.from(container.children).filter((node): node is HTMLElement => {
    if (!(node instanceof HTMLElement)) return false;
    if (node.matches('header, nav, script, style, [hidden], [data-mobile-pager-ignore="true"]')) return false;
    if (node.matches(SKIP_SELECTOR) || node.querySelector(SKIP_SELECTOR)) return false;
    return true;
  });
}

function buildGroups(items: HTMLElement[]) {
  const targetHeight = Math.max(440, Math.min(680, window.innerHeight * 0.72));
  const groups: HTMLElement[][] = [];
  let group: HTMLElement[] = [];
  let height = 0;

  items.forEach((item) => {
    const itemHeight = Math.max(item.getBoundingClientRect().height, item.scrollHeight, 120);
    const shouldBreak = group.length > 0 && (height + itemHeight > targetHeight || group.length >= 2);
    if (shouldBreak) {
      groups.push(group);
      group = [];
      height = 0;
    }
    group.push(item);
    height += itemHeight;
  });

  if (group.length) groups.push(group);
  return groups;
}

function button(label: string, className: string) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.textContent = label;
  return el;
}

export default function MobileSectionPager() {
  useEffect(() => {
    const states = new WeakMap<Element, PagerState>();
    const mobile = () => window.matchMedia('(max-width: 767px)').matches;
    let scheduled = false;

    const removePager = (container: Element) => {
      const state = states.get(container);
      if (!state) return;
      state.groups.flat().forEach((item) => {
        item.hidden = false;
        item.removeAttribute('data-mobile-page-item');
      });
      state.controls?.remove();
      state.progress?.remove();
      states.delete(container);
    };

    const render = (container: Element, resetGroups = false) => {
      if (!mobile()) {
        removePager(container);
        return;
      }

      const items = eligibleChildren(container);
      if (items.length < 3 || container.scrollHeight < window.innerHeight * 1.25) {
        removePager(container);
        return;
      }

      let state = states.get(container);
      const nextGroups = resetGroups || !state ? buildGroups(items) : state.groups;
      if (nextGroups.length < 2) {
        removePager(container);
        return;
      }

      if (!state) state = { page: 0, groups: nextGroups, controls: null, progress: null };
      state.groups = nextGroups;
      state.page = Math.min(state.page, state.groups.length - 1);

      state.groups.forEach((group, groupIndex) => {
        group.forEach((item) => {
          item.hidden = groupIndex !== state!.page;
          item.dataset.mobilePageItem = String(groupIndex + 1);
        });
      });

      state.controls?.remove();
      state.progress?.remove();

      const progress = document.createElement('div');
      progress.className = 'mobileSectionProgress';
      progress.setAttribute('aria-label', `Step ${state.page + 1} of ${state.groups.length}`);
      const track = document.createElement('span');
      track.className = 'mobileSectionProgressTrack';
      const fill = document.createElement('span');
      fill.className = 'mobileSectionProgressFill';
      fill.style.width = `${((state.page + 1) / state.groups.length) * 100}%`;
      const text = document.createElement('strong');
      text.textContent = `${state.page + 1} / ${state.groups.length}`;
      track.append(fill);
      progress.append(track, text);
      container.insertAdjacentElement('beforebegin', progress);

      const controls = document.createElement('div');
      controls.className = 'mobileSectionPager';
      controls.setAttribute('data-mobile-section-pager', 'true');

      const previous = button('Back', 'mobileSectionPagerButton mobileSectionPagerBack');
      previous.disabled = state.page === 0;
      previous.addEventListener('click', () => {
        const current = states.get(container);
        if (!current || current.page === 0) return;
        current.page -= 1;
        states.set(container, current);
        render(container);
        progress.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      const next = button(state.page === state.groups.length - 1 ? 'Done' : 'Continue', 'mobileSectionPagerButton mobileSectionPagerNext');
      next.addEventListener('click', () => {
        const current = states.get(container);
        if (!current) return;
        if (current.page >= current.groups.length - 1) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        current.page += 1;
        states.set(container, current);
        render(container);
        progress.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      controls.append(previous, next);
      container.insertAdjacentElement('afterend', controls);
      state.controls = controls;
      state.progress = progress;
      states.set(container, state);
    };

    const apply = (resetGroups = false) => {
      scheduled = false;
      document.querySelectorAll(CONTENT_SELECTORS).forEach((container) => render(container, resetGroups));
    };

    const schedule = (resetGroups = false) => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => apply(resetGroups));
    };

    apply(true);

    const observer = new MutationObserver((mutations) => {
      if (mutations.every((mutation) => mutation.target instanceof Element && mutation.target.closest('[data-mobile-section-pager="true"]'))) return;
      schedule(true);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const onResize = () => schedule(true);
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.querySelectorAll(CONTENT_SELECTORS).forEach(removePager);
    };
  }, []);

  return null;
}
