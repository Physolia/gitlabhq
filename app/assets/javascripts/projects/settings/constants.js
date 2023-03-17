import { __ } from '~/locale';

export const LEVEL_TYPES = {
  ROLE: 'role',
  USER: 'user',
  DEPLOY_KEY: 'deploy_key',
  GROUP: 'group',
};

export const LEVEL_ID_PROP = {
  ROLE: 'access_level',
  USER: 'user_id',
  DEPLOY_KEY: 'deploy_key_id',
  GROUP: 'group_id',
};

export const ACCESS_LEVELS = {
  MERGE: 'merge_access_levels',
  PUSH: 'push_access_levels',
  CREATE: 'create_access_levels',
};

export const ACCESS_LEVEL_NONE = 0;

// must match shared_runners_setting in update_service.rb
export const CC_VALIDATION_REQUIRED_ERROR = __(
  'Shared runners enabled cannot be enabled until a valid credit card is on file',
);
