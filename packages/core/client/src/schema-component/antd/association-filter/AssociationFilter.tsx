import { css } from '@emotion/css';
import { useFieldSchema } from '@formily/react';
import cls from 'classnames';
import React from 'react';
import { useCollection } from '../../../collection-manager';
import { useSchemaInitializer } from '../../../schema-initializer';
import { DndContext, SortableItem } from '../../common';
import { useDesigner } from '../../hooks';
import { AssociationFilterBlockDesigner } from './AssociationFilter.BlockDesigner';
import { AssociationFilterInitializer } from './AssociationFilter.Initializer';
import { AssociationFilterItem } from './AssociationFilter.Item';
import { AssociationFilterItemDesigner } from './AssociationFilter.Item.Designer';

export const AssociationFilter = (props) => {
  const Designer = useDesigner();
  const filedSchema = useFieldSchema();

  const { exists, render } = useSchemaInitializer(filedSchema['x-initializer']);

  return (
    <DndContext>
      <SortableItem
        className={cls(
          'nb-block-item',
          props.className,
          css`
            position: relative;
            &:hover {
              > .general-schema-designer {
                display: block;
              }
            }
            &.nb-form-item:hover {
              > .general-schema-designer {
                background: rgba(241, 139, 98, 0.06) !important;
                border: 0 !important;
                top: -5px !important;
                bottom: -5px !important;
                left: -5px !important;
                right: -5px !important;
              }
            }
            > .general-schema-designer {
              position: absolute;
              z-index: 999;
              top: 0;
              bottom: 0;
              left: 0;
              right: 0;
              display: none;
              border: 2px solid rgba(241, 139, 98, 0.3);
              pointer-events: none;
              > .general-schema-designer-icons {
                position: absolute;
                right: 2px;
                top: 2px;
                line-height: 16px;
                pointer-events: all;
                .ant-space-item {
                  background-color: #f18b62;
                  color: #fff;
                  line-height: 16px;
                  width: 16px;
                  padding-left: 1px;
                }
              }
            }
          `,
        )}
      >
        <Designer />
        {props.children}
        {render()}
      </SortableItem>
    </DndContext>
  );
};

AssociationFilter.Initializer = AssociationFilterInitializer;
AssociationFilter.Item = AssociationFilterItem as typeof AssociationFilterItem & {
  Designer: typeof AssociationFilterItemDesigner;
};
AssociationFilter.Item.Designer = AssociationFilterItemDesigner;
AssociationFilter.BlockDesigner = AssociationFilterBlockDesigner;

AssociationFilter.useAssociationField = () => {
  const fieldSchema = useFieldSchema();
  const { getField } = useCollection();
  return React.useMemo(() => getField(fieldSchema.name as any), [fieldSchema.name]);
};
