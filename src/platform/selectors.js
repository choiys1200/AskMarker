'use strict';
const COMPOSER_SELECTOR='#prompt-textarea,[data-composer-markdown][contenteditable="true"],[data-composer-input] [contenteditable="true"][role="textbox"]';
const MESSAGE_ATTRS=['data-message-id','data-dil-message-id','data-dil-source-message-id','data-chatgpt-selection-message-id'];
const ANSWER_SELECTORS=['[data-message-author-role="assistant"]','[data-markdown-text-style="assistant-message"]','[data-conversation-role="assistant"]:not(h4)','[data-turn="assistant"]'];
const NON_ANSWER='[data-user-message-bubble],[data-message-author-role="user"],[data-conversation-role="user"],[data-turn="user"],nav,aside,[role="navigation"],#prompt-textarea';
// Observed in ChatGPT on 2026-10-17. Editable writing blocks are answer content;
// the actual composer and unrelated editors must still be excluded.
const WRITING_BOX='[data-oai-writing-block-surface],[data-testid="chatgpt-writing-block"]';
module.exports={COMPOSER_SELECTOR,MESSAGE_ATTRS,ANSWER_SELECTORS,NON_ANSWER,WRITING_BOX};
