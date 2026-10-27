/* global process */
// Studio、CLI 共用选择结果；无配置时使用开发数据，避免意外写入正式数据。
export const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 't3dj4nuv'
export const dataset = process.env.SANITY_STUDIO_DATASET || 'development'
