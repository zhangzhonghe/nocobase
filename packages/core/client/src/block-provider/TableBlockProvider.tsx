import { ArrayField, createForm } from '@formily/core';
import { FormContext, Schema, useField, useFieldSchema } from '@formily/react';
import uniq from 'lodash/uniq';
import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useCollectionManager } from '../collection-manager';
import { BlockProvider, RenderChildrenWithAssociationFilter, useBlockRequestContext } from './BlockProvider';
import { removeNullCondition, useFixedSchema } from '../schema-component';
import { useFilterBlock } from '../filter-provider/FilterProvider';
import { findFilterTargets } from './hooks';
import { mergeFilter } from './SharedFilterProvider';

export const TableBlockContext = createContext<any>({});

interface Props {
  params?: any;
  showIndex?: boolean;
  dragSort?: boolean;
  rowKey?: string;
  /** 目前可能的值仅为 'filter'，用于区分筛选区块和数据区块 */
  blockType?: 'filter';
}

const InternalTableBlockProvider = (props: Props) => {
  const { params, showIndex, dragSort, rowKey, blockType } = props;
  const field = useField();
  const { resource, service } = useBlockRequestContext();
  // if (service.loading) {
  //   return <Spin />;
  // }
  useFixedSchema();
  return (
    <TableBlockContext.Provider
      value={{
        field,
        service,
        resource,
        params,
        showIndex,
        dragSort,
        rowKey,
        blockType,
      }}
    >
      <RenderChildrenWithAssociationFilter {...props} />
    </TableBlockContext.Provider>
  );
};

export const useAssociationNames = (collection) => {
  const { getCollectionFields } = useCollectionManager();
  const collectionFields = getCollectionFields(collection);
  const associationFields = new Set();
  for (const collectionField of collectionFields) {
    if (collectionField.target) {
      associationFields.add(collectionField.name);
      const fields = getCollectionFields(collectionField.target);
      for (const field of fields) {
        if (field.target) {
          associationFields.add(`${collectionField.name}.${field.name}`);
        }
      }
    }
  }
  const fieldSchema = useFieldSchema();
  const tableSchema = fieldSchema.reduceProperties((buf, schema) => {
    if (schema['x-component'] === 'TableV2') {
      return schema;
    }
    return buf;
  }, new Schema({}));
  return uniq(
    tableSchema.reduceProperties((buf, schema) => {
      if (schema['x-component'] === 'TableV2.Column') {
        const s = schema.reduceProperties((buf, s) => {
          const [name] = (s.name as string).split('.');
          if (s['x-collection-field'] && associationFields.has(name)) {
            return s;
          }
          return buf;
        }, null);
        if (s) {
          // 关联字段和关联的关联字段
          const [firstName] = s.name.split('.');
          if (associationFields.has(s.name)) {
            buf.push(s.name);
          } else if (associationFields.has(firstName)) {
            buf.push(firstName);
          }
        }
      }
      return buf;
    }, []),
  );
};

export const TableBlockProvider = (props) => {
  const params = { ...props.params };
  const appends = useAssociationNames(props.collection);
  const form = useMemo(() => createForm(), []);
  if (props.dragSort) {
    params['sort'] = ['sort'];
  }
  if (!Object.keys(params).includes('appends')) {
    params['appends'] = appends;
  }
  return (
    <FormContext.Provider value={form}>
      <BlockProvider {...props} params={params}>
        <InternalTableBlockProvider {...props} params={params} />
      </BlockProvider>
    </FormContext.Provider>
  );
};

export const useTableBlockContext = () => {
  return useContext(TableBlockContext);
};

export const useTableBlockProps = () => {
  const field = useField<ArrayField>();
  const fieldSchema = useFieldSchema();
  const ctx = useTableBlockContext();
  const globalSort = fieldSchema.parent?.['x-decorator-props']?.['params']?.['sort'];
  const { getDataBlocks } = useFilterBlock();

  useEffect(() => {
    if (!ctx?.service?.loading) {
      field.value = ctx?.service?.data?.data;
      field.data = field.data || {};
      field.data.selectedRowKeys = ctx?.field?.data?.selectedRowKeys;
      field.componentProps.pagination = field.componentProps.pagination || {};
      field.componentProps.pagination.pageSize = ctx?.service?.data?.meta?.pageSize;
      field.componentProps.pagination.total = ctx?.service?.data?.meta?.count;
      field.componentProps.pagination.current = ctx?.service?.data?.meta?.page;
    }
  }, [ctx?.service?.loading]);
  return {
    loading: ctx?.service?.loading,
    showIndex: ctx.showIndex,
    dragSort: ctx.dragSort,
    rowKey: ctx.rowKey || 'id',
    pagination:
      ctx?.params?.paginate !== false
        ? {
            defaultCurrent: ctx?.params?.page || 1,
            defaultPageSize: ctx?.params?.pageSize,
          }
        : false,
    onRowSelectionChange(selectedRowKeys) {
      ctx.field.data = ctx?.field?.data || {};
      ctx.field.data.selectedRowKeys = selectedRowKeys;
    },
    async onRowDragEnd({ from, to }) {
      await ctx.resource.move({
        sourceId: from[ctx.rowKey || 'id'],
        targetId: to[ctx.rowKey || 'id'],
      });
      ctx.service.refresh();
    },
    onChange({ current, pageSize }, filters, sorter) {
      let sort = sorter.order
        ? sorter.order === `ascend`
          ? [sorter.field]
          : [`-${sorter.field}`]
        : globalSort || ctx.service.params?.[0]?.sort;
      ctx.service.run({ ...ctx.service.params?.[0], page: current, pageSize, sort });
    },
    // 该方法是专门为筛选区块服务的
    onClickRow(record, setSelectedRowKeys) {
      if (ctx.blockType !== 'filter') return;

      const value = [record[ctx.rowKey]];
      const { targets, uid } = findFilterTargets(fieldSchema);

      getDataBlocks().forEach((block) => {
        const target = targets.find((target) => target.name === block.name);
        if (!target) return;

        block.filters[uid] = {
          $and: [
            {
              [target.field || ctx.rowKey]: {
                [target.field ? '$in' : '$eq']: value,
              },
            },
          ],
        };

        const param = block.service.params?.[0] || {};
        return block.doFilter({
          ...param,
          page: 1,
          // TODO: 应该也需要合并数据区块中所设置的筛选条件
          filter: mergeFilter([...Object.values(block.filters).map((filter) => removeNullCondition(filter))]),
        });
      });

      ctx.field.data = ctx?.field?.data || {};
      ctx.field.data.selectedRowKeys = value;
      // 更新表格的选中状态
      setSelectedRowKeys(value);
    },
  };
};
