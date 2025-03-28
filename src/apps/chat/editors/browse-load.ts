/*
// NOTE: this is not used anymore and here just as a reference code and to demonstrate alternative conversation modes / editors

import { callBrowseFetchPageOrThrow } from '~/modules/browse/browse.client';

import type { ConversationHandler } from '~/common/chat-overlay/ConversationHandler';
import { createErrorContentFragment, createTextContentFragment } from '~/common/stores/chat/chat.fragments';


export const runBrowseGetPageUpdatingState = async (cHandler: ConversationHandler, url?: string) => {
  if (!url) {
    cHandler.messageAppendAssistantText('Issue: no URL provided.', 'issue');
    return false;
  }

  // noinspection HttpUrlsUsage
  const shortUrl = url.replace('https://www.', '').replace('https://', '').replace('http://', '').replace('www.', '');
  const { assistantMessageId, placeholderFragmentId } = cHandler.messageAppendAssistantPlaceholder(
    `Loading page at ${shortUrl}...`,
    { generator: { mgt: 'named', name: 'web' } },
  );

  try {
    const page = await callBrowseFetchPageOrThrow(url);
    if (!page.content) {
      cHandler.messageFragmentReplace(assistantMessageId, placeholderFragmentId, createErrorContentFragment('Issue: Browsing pointed to a file but we do not support files at the moment.'), true);
      return false;
    }

    const pageContent = page.content.markdown || page.content.text || page.content.html || 'Issue: Browsing did not produce a page content.';
    cHandler.messageFragmentReplace(assistantMessageId, placeholderFragmentId, createTextContentFragment(pageContent), true);

    return true;
  } catch (error: any) {
    console.error(error);

    const pageError = 'Issue: Browsing did not produce a page.\n(error: ' + (error?.message || error?.toString() || 'unknown') + ').';
    cHandler.messageFragmentReplace(assistantMessageId, placeholderFragmentId, createErrorContentFragment(pageError), true);

    return false;
  }
};
 */