import { PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { IsInt, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import dayjs from 'dayjs'

export class Base {

    @ApiProperty({ description: 'ID', example: 1 })
    @PrimaryGeneratedColumn()
    @IsInt()
    @Min(0)
    id: number

    @ApiProperty({ description: '创建时间', example: dayjs().toDate() })
    @CreateDateColumn()
    createdAt: Date

    @ApiProperty({ description: '更新时间', example: dayjs().toDate() })
    @UpdateDateColumn()
    updatedAt: Date

}
