import { PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'
import dayjs from 'dayjs'
import { ValidateIf } from 'class-validator'
import { IsId } from '@/decorators/is-id.decorator'

export class Base {

    @ApiProperty({ description: 'ID', example: 1 })
    @PrimaryGeneratedColumn()
    @IsId()
    @ValidateIf((o) => typeof o.id !== 'undefined')
    id: number

    @ApiProperty({ description: '创建时间', example: dayjs().toDate() })
    @Index()
    @CreateDateColumn()
    createdAt: Date

    @ApiProperty({ description: '更新时间', example: dayjs().toDate() })
    @Index()
    @UpdateDateColumn()
    updatedAt: Date

}
