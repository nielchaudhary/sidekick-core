export enum AnthropicEventTypes {
  CONTENT_BLOCK_START = 'content_block_start',
  CONTENT_BLOCK_DELTA = 'content_block_delta',
}

export enum AnthropicContentBlockTypes {
  SERVER_TOOL_USE = 'server_tool_use',
}

export enum AnthropicContentBlockNames {
  WEB_SEARCH = 'web_search',
}

export enum RoleTypes {
  USER = 'user',
  SYSTEM = 'system',
}
