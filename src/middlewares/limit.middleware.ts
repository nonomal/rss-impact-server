import RateLimit from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import { ErrorMessageList } from '@/constant/error-message-list'
import { ResponseDto } from '@/models/response.dto'
import { __DEV__, REDIS_URL } from '@/app.config'
import { getRedisClient } from '@/utils/redis'

const store = REDIS_URL ? new RedisStore({
    prefix: 'rss-impact:',
    // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
    sendCommand: (...args: string[]) => getRedisClient().call(...args),
}) : undefined
/**
 * 限流器
 */
export const limiter = RateLimit({
    store,
    max: __DEV__ ? 10000 : 1000,
    windowMs: 1000 * 60, // 1 分钟时间
    validate: {
        trustProxy: false, // 解决 ERR_ERL_PERMISSIVE_TRUST_PROXY 代理不可信问题
    },
    handler(req, res) { // 响应格式
        res.format({
            json() {
                res.status(429).json(new ResponseDto({
                    statusCode: 429,
                    error: 'TOO_MANY_REQUESTS',
                    message: ErrorMessageList.get(429),
                }))
            },
        })
    },
})
