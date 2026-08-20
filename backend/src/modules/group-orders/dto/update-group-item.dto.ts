import { PartialType } from '@nestjs/mapped-types';
import { AddGroupItemDto } from './add-group-item.dto';

export class UpdateGroupItemDto extends PartialType(AddGroupItemDto) {}
