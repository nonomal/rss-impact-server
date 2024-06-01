import crypto from 'crypto'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import relativeTime from 'dayjs/plugin/relativeTime'
import _ from 'lodash'
import fs, { ReadStream } from 'fs-extra'
import FileType from 'file-type'
import Turndown from 'turndown'
import { Equal, Like, ILike, Between, In } from 'typeorm'
import { ValidationError } from 'class-validator'
import { CQImage } from 'go-cqwebsocket/out/tags'
import { encode, decode } from 'gpt-3-encoder'
import * as betterBytes from 'better-bytes'
import ms from 'ms'
import { ajax } from './ajax'
import { TZ } from '@/app.config'
// TODO 考虑支持国际化
import 'dayjs/locale/zh-cn'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault(TZ)
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

/**
 * 延时一段时间
 *
 * @author CaoMeiYouRen
 * @date 2019-08-26
 * @export
 * @param time 如果是 string ，则用 ms 解析为 number
 * @returns
 */
export async function sleep(time: number | string) {
    if (typeof time === 'string') {
        time = ms(time)
    }
    return new Promise((resolve) => setTimeout(resolve, time))
}

/**
 * 随机延时一段时间
 *
 * @author CaoMeiYouRen
 * @date 2022-06-04
 * @export
 * @param [min=1000] 延时最小值
 * @param [max=10000] 延时最大值
 */
export async function randomSleep(min: number | string = 1000, max: number | string = 10000) {
    if (typeof min === 'string') {
        min = ms(min)
    }
    if (typeof max === 'string') {
        max = ms(max)
    }
    const time = _.random(min, max, false)
    await sleep(time)
}

/**
 * 格式化时间
 *
 * @author CaoMeiYouRen
 * @export
 * @param {(number | string | Date)} [date=Date.now()]
 * @param {string} [pattern='YYYY-MM-DD HH:mm:ss.SSS']
 * @returns
 */
export function timeFormat(date: number | string | Date = Date.now(), pattern: string = 'YYYY-MM-DD HH:mm:ss.SSS') {
    if (typeof date === 'number' && date.toString().length === 10) {
        if (date < 1e10) {
            date *= 1000
        }
    }
    return dayjs(date).tz().format(pattern)
}

export function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : r & 0x3 | 0x8
        return v.toString(16)
    })
}

type TokenType = 'rss-impact' | 'custom-query-key'

export function getAccessToken(type: TokenType = 'rss-impact') {
    return `${type}:${uuid()}`
}

export function isImageUrl(img: string) {
    return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(img)
}

/**
 * 递归删除对象中指定的属性
 * @author CaoMeiYouRen
 * @date 2022-09-27
 * @export
 * @param obj 原始对象
 * @param props 需要删除的属性名称列表
 */
export function deepOmit(obj: any, props: string[]) {
    if (typeof obj !== 'object' || obj === null) { // 类型不为object的或类型为null的都直接返回
        return obj
    }
    props.forEach((key) => { // 排除当前层级的 props
        delete obj[key]
    })
    const keys = Object.keys(obj) // 数组或对象
    for (let i = 0; i < keys.length; i++) { // 遍历所有key
        const key = keys[i]
        obj[key] = deepOmit(obj[key], props)// 递归
    }
    return obj
}

/**
 * 深度处理冗余的空白字符串
 *
 * @author CaoMeiYouRen
 * @date 2024-03-21
 * @export
 * @param obj
 */
export function deepTrim(obj: any) {
    if (typeof obj !== 'object' || obj === null) { // 类型不为object的或类型为null的都直接返回
        return obj
    }
    const keys = Object.keys(obj) // 数组或对象
    for (let i = 0; i < keys.length; i++) { // 遍历所有key
        const key = keys[i]
        if (typeof obj[key] === 'string') {
            obj[key] = obj[key].trim() // 移除空白字符串
        } else {
            obj[key] = deepTrim(obj[key]) // 递归
        }
    }
    return obj
}

type DownloadFileType = {
    size: number
    type: string
    hash: string
}

export async function download(url: string, filepath: string, timeout = 60 * 1000, proxyUrl?: string): Promise<DownloadFileType> {
    const resp = await ajax({
        url,
        proxyUrl,
        timeout,
        headers: {
            Referer: url,
        } as any,
        responseType: 'stream',
    })
    const stream = resp.data as ReadStream
    // const { mime } = await FileType.fromStream(stream)
    const writer = fs.createWriteStream(filepath)
    stream.pipe(writer)
    return new Promise<DownloadFileType>((resolve, reject) => {
        writer.on('finish', async () => {
            const stat = await fs.stat(filepath)
            const mime = (await FileType.fromFile(filepath))?.mime
            const hash = await getMd5ByStream(filepath)
            resolve({
                size: stat.size,
                type: mime,
                hash,
            })
        })
        writer.on('error', reject)
    })
}

/**
 * 提取所有 src 中的 URL
 *
 * @author CaoMeiYouRen
 * @date 2024-03-24
 * @export
 * @param content
 */
export function getAllUrls(content: string): string[] {
    const res = content.matchAll(/src="(.*?)"/g) || []
    return [...res].map((e) => e?.[1])
}

/**
 * 流式求 md5，避免占用内存过高
 *
 * @author CaoMeiYouRen
 * @date 2024-03-24
 * @export
 * @param filePath
 */
export function getMd5ByStream(filePath: string) {
    return new Promise<string>((resolve, reject) => {
        const hash = crypto.createHash('md5')

        const stream = fs.createReadStream(filePath)

        stream.on('error', (err) => reject(err))

        stream.on('data', (chunk) => hash.update(chunk))

        stream.on('end', () => {
            resolve(hash.digest('hex'))
        })
    })
}

export function htmlToMarkdown(html: string): string {
    const turndownService = new Turndown({
        headingStyle: 'atx',
        bulletListMarker: '-',
    })
    const markdown = turndownService.turndown(html)
    return markdown
}

// 支持 传入的操作符
const QUERY_MAP = {
    Equal, Like, ILike, Between, In,
}

/**
 * 转换 query 为真实的操作符
 *
 * @author CaoMeiYouRen
 * @date 2024-04-08
 * @export
 * @param [where]
 */
export function transformQueryOperator(where?: Record<string, any>) {
    return Object.fromEntries(Object.entries(where)
        .map(([key, value]) => {
            if (['string', 'number', 'boolean'].includes(typeof value)) { // 如果是基础类型，则原样返回
                return [key, value]
            }
            if (value?.$op && QUERY_MAP[value.$op]) { // 转换为真实的操作符
                if (value.$op === 'Between') {
                    return [key, QUERY_MAP[value.$op](value.value?.[0], value.value?.[1])]
                }
                return [key, QUERY_MAP[value.$op](value.value)]
            }
            return [key, value]
        }),
    )
}

export function getDateTransformer() {
    const transformer = {
        from(value: string): Date { // 数据库到实体类
            if (!value) {
                return null
            }
            if (/^\d\d\d\d-\d\d-\d\d \d\d:\d\d/.test(value)) { // 非 ISO 格式的改为 ISO
                value = value.replace(' ', 'T')
            }
            if (
                /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d\d\d)?)?$/.test(
                    value,
                )
            ) {
                value += 'Z'
            }
            return new Date(value)
        },
        to(value: Date): string { // 实体类到数据库
            if (!value) {
                return null
            }
            return value.toISOString()
        },
    }
    return {
        type: 'text',
        transformer,
    }
}

export function flattenValidationErrors(
    validationErrors: ValidationError[],
): string[] {
    return _.flattenDeep(
        _.flattenDeep(validationErrors
            .map((error) => mapChildrenToValidationErrors(error)),
        )
            .filter((item) => !!item.constraints)
            .map((item) => Object.values(item.constraints)),
    )

}

function mapChildrenToValidationErrors(
    error: ValidationError,
    parentPath?: string,
): ValidationError[] {
    if (!(error.children && error.children.length)) {
        return [error]
    }
    const validationErrors = []
    parentPath = parentPath
        ? `${parentPath}.${error.property}`
        : error.property
    for (const item of error.children) {
        if (item.children && item.children.length) {
            validationErrors.push(
                ...mapChildrenToValidationErrors(item, parentPath),
            )
        }
        validationErrors.push(
            prependConstraintsWithParentProp(parentPath, item),
        )
    }
    return validationErrors
}

function prependConstraintsWithParentProp(
    parentPath: string,
    error: ValidationError,
): ValidationError {
    const constraints = {}
    for (const key in error.constraints) {
        constraints[key] = `${parentPath}.${error.constraints[key]}`
    }
    return {
        ...error,
        constraints,
    }
}

const imageRegex = /!\[(.*?)\]\((.*?)\)/g

export function mdToCqcode(md: string) {
    const result = md.replace(imageRegex, (match, altText, imageUrl) => new CQImage('image', { file: imageUrl }).toString())
    return result
}

/**
 * 格式化流量数据
 *
 * @author CaoMeiYouRen
 * @date 2024-04-12
 * @export
 * @param data 单位B
 */
export function dataFormat(data: number | bigint): string {
    return betterBytes.format(data, { standard: 'kilobinary', decimal: 2, unitSeparator: ' ' })
}

/**
 * 解析流量数据。如果为 number，则返回本身；如果为 string，则返回 betterBytes.parse 后的结果
 *
 * @author CaoMeiYouRen
 * @date 2024-05-26
 * @export
 * @param data
 */
export function parseDataSize(data: number | string): number {
    if (typeof data === 'number') {
        return data
    }
    return Number(betterBytes.parse(data))
}

type RetryBackoffConfig = {
    /**
     * 最大重试次数
     */
    maxRetries?: number

    /**
     * 初始重试间隔
     */
    initialInterval?: number
    /**
     * 最大重试间隔
     */
    maxInterval?: number

    /**
     * 是否继续重试，返回 true 继续
     */
    shouldRetry?: (error: Error) => (boolean | Promise<boolean>)
}
/**
 * 指数退避 重试，每次重试会指数级延后时间
 *
 * @author CaoMeiYouRen
 * @date 2022-11-14
 * @export
 * @template T
 * @param cb
 * @param [config={}]
 */
export async function retryBackoff<T = void>(cb: () => T | Promise<T>, config: RetryBackoffConfig = {}) {
    const { maxRetries = 3, initialInterval = 1000, maxInterval = 60 * 1000, shouldRetry = () => true } = config
    let currentRetries = 0 // 当前重试次数
    do {
        try {
            return await cb() // 如果没有抛出异常直接 return
        } catch (err: any) { // 如果异常则重试
            if (!await shouldRetry(err)) { // 如果不继续重试，直接结束
                throw err
            }
            currentRetries++
            if (currentRetries >= maxRetries) {
                throw new Error(`函数 ${cb.name} 重试次数已达到最大重试次数 ${maxRetries} 次！`, { cause: err })
            }
            const interval = Math.max(10, initialInterval) // 不小于 10 毫秒
            const delayed = interval * 2 ** currentRetries // 2 的 currentRetries 次方
            if (delayed >= maxInterval) {
                throw new Error(`函数 ${cb.name} 重试次数已达到重试间隔 ${maxInterval} 次！`, { cause: err })
            }
            await sleep(delayed) // 等待重试
        }
    } while (currentRetries < maxRetries)
}

/**
 * 辅助函数，将字符串分割为指定长度的块
 *
 * @author CaoMeiYouRen
 * @date 2024-04-16
 * @export
 * @param str
 * @param maxLength
 */
export function splitString(str: string, maxLength: number): string[] {
    if (maxLength <= 0 || !str?.length) {
        return [str] // 如果 maxLength 为 0 或负数,或者输入字符串为空,返回包含原始字符串的数组
    }
    const chunks: string[] = []
    let start = 0
    while (start < str.length) {
        chunks.push(str.slice(start, start + maxLength))
        start += maxLength
    }
    return chunks
}

/**
 * 检测是否为 http/https 开头的 url
 * @param url
 * @returns
 */
export const isHttpURL = (url: string) => /^(https?:\/\/)/.test(url)

/**
 * 检测是否为 socks/socks5 开头的 url
 * @param url
 * @returns
 */
export const isSocksUrl = (url: string) => /^(socks5?:\/\/)/.test(url)

/**
 *
 * @author CaoMeiYouRen
 * @date 2023-01-09
 * @export
 * @template T
 * @template U
 * @param promise
 * @param [errorExt] 可以传递给err对象的其他信息
 */
export async function to<T = any, U = Error>(
    promise: Promise<T>,
    errorExt?: Record<string, unknown>,
): Promise<[U, undefined] | [null, T]> {
    try {
        const data = await promise
        const result: [null, T] = [null, data]
        return result
    } catch (err) {
        if (errorExt) {
            const parsedError = Object.assign({}, err, errorExt)
            return [parsedError, undefined]
        }
        const result_1: [U, undefined] = [err, undefined]
        return result_1
    }
}

export function getTokenLength(text: string) {
    return encode(text).length
}

/**
 * 按 maxTokens 限制 text 长度
 *
 * @author CaoMeiYouRen
 * @date 2024-04-23
 * @export
 * @param text
 * @param maxTokens
 */
export function limitToken(text: string, maxTokens: number): string {
    return decode(encode(text).slice(0, maxTokens))
}

/**
 * 辅助函数，将字符串按 token 分割为指定长度的块
 * @author CaoMeiYouRen
 * @date 2024-04-23
 * @export
 * @param str
 * @param maxLength
 */
export function splitStringByToken(str: string, maxLength: number): string[] {
    if (maxLength <= 0 || !str?.length) {
        return [str] // 如果 maxLength 为 0 或负数,或者输入字符串为空,返回包含原始字符串的数组
    }
    const tokens = encode(str)
    const chunks: string[] = []
    let start = 0
    while (start < tokens.length) {
        chunks.push(decode(tokens.slice(start, start + maxLength)))
        start += maxLength
    }
    return chunks
}

const rWhiteSpace = /\s+/
const rAllWhiteSpace = /\s+/g

// collapse all whitespaces into a single space (like "white-space: normal;" would do), and trim
export const collapseWhitespace = (str?: string | null) => {
    if (str && rWhiteSpace.test(str)) {
        return str.replaceAll(rAllWhiteSpace, ' ').trim()
    }
    return str
}

/**
 * 格式化时间
 *
 * @author CaoMeiYouRen
 * @date 2020-05-29
 * @export
 * @param {number} time 毫秒数
 * @returns
 */
export function timeFromNow(time: number) {
    const arr = [
        { name: 'milliseconds', len: 1000 },
        { name: 'seconds', len: 60 },
        { name: 'minutes', len: 60 },
        { name: 'hours', len: 24 },
        // { name: 'day', len: Infinity },
    ]
    for (let i = 0; i < arr.length; i++) {
        if (time < arr[i].len) {
            return `${time.toFixed(2)} ${arr[i].name}`
        }
        time /= arr[i].len
    }
    return `${time.toFixed(2)} days`
}
