import { Column, ManyToOne } from 'typeorm'
import { ApiProperty } from '@nestjs/swagger'
import { ValidateIf } from 'class-validator'
import { Base } from './base.entity'
import { User } from './user.entity'
import { IsId } from '@/decorators/is-id.decorator'
import { SetAclCrudField } from '@/decorators/set-acl-crud-field.decorator'

export abstract class AclBase extends Base {

    // acl

    @SetAclCrudField({
        dicUrl: '/user/dicData',
    })
    @ApiProperty({ title: '所属用户', example: 1 })
    @IsId()
    @ValidateIf((o) => typeof o.userId !== 'undefined')
    @Column({ nullable: true })
    userId: number

    @SetAclCrudField({
        hide: true,
    })
    @ApiProperty({ title: '所属用户', type: () => User })
    @ManyToOne(() => User)
    user: User

}
