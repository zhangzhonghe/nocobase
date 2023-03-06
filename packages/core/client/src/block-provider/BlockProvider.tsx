import { css } from '@emotion/css';
import { Field } from '@formily/core';
import { RecursionField, useField, useFieldSchema } from '@formily/react';
import { useRequest } from 'ahooks';
import { Col, Row } from 'antd';
import template from 'lodash/template';
import React, { createContext, useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  ACLCollectionProvider,
  TableFieldResource,
  useActionContext,
  useAPIClient,
  useDesignable,
  useRecord,
  WithoutTableFieldResource,
} from '../';
import { CollectionProvider, useCollection, useCollectionManager } from '../collection-manager';
import { FilterBlockRecord } from '../filter-provider/FilterProvider';
import { useRecordIndex } from '../record-provider';
import { SharedFilterProvider } from './SharedFilterProvider';

export const BlockResourceContext = createContext(null);
export const BlockAssociationContext = createContext(null);
export const BlockRequestContext = createContext<any>({});

export const useBlockResource = () => {
  return useContext(BlockResourceContext);
};

interface UseResourceProps {
  resource: any;
  association?: any;
  useSourceId?: any;
  block?: any;
}

export const useAssociation = (props) => {
  const { association } = props;
  const { getCollectionField } = useCollectionManager();
  if (typeof association === 'string') {
    return getCollectionField(association);
  } else if (association?.collectionName && association?.name) {
    return getCollectionField(`${association?.collectionName}.${association?.name}`);
  }
};

const useResource = (props: UseResourceProps) => {
  const { block, resource, useSourceId } = props;
  const record = useRecord();
  const api = useAPIClient();
  const association = useAssociation(props);
  const sourceId = useSourceId?.();

  const field = useField<Field>();
  if (block === 'TableField') {
    const options = {
      field,
      api,
      resource,
      sourceId: sourceId || record[association?.sourceKey || 'id'],
    };
    return new TableFieldResource(options);
  }
  const withoutTableFieldResource = useContext(WithoutTableFieldResource);
  const __parent = useContext(BlockRequestContext);
  if (
    !withoutTableFieldResource &&
    __parent?.block === 'TableField' &&
    __parent?.resource instanceof TableFieldResource
  ) {
    return __parent.resource;
  }
  if (!association) {
    return api.resource(resource);
  }
  if (sourceId) {
    return api.resource(resource, sourceId);
  }

  return api.resource(resource, record[association?.sourceKey || 'id']);
};

const useActionParams = (props) => {
  const { useParams } = props;
  const params = useParams?.() || {};
  return { ...props.params, ...params };
};

export const useResourceAction = (props, opts = {}) => {
  /**
   * fieldName: 来自 TableFieldProvider
   */
  const { resource, action, fieldName: tableFieldName } = props;
  const { fields } = useCollection();
  const appends = fields?.filter((field) => field.target).map((field) => field.name);
  const params = useActionParams(props);
  const api = useAPIClient();
  const fieldSchema = useFieldSchema();
  const { snapshot } = useActionContext();
  const record = useRecord();

  if (!Object.keys(params).includes('appends') && appends?.length) {
    params['appends'] = appends;
  }
  const result = useRequest(
    snapshot
      ? async () => ({
          data: record[tableFieldName] ?? [],
        })
      : (opts) => {
          if (!action) {
            return Promise.resolve({});
          }
          const actionParams = { ...opts };
          if (params.appends) {
            actionParams.appends = params.appends;
          }
          return resource[action](actionParams).then((res) => res.data);
        },
    {
      ...opts,
      onSuccess(data, params) {
        opts?.['onSuccess']?.(data, params);
        if (fieldSchema['x-uid']) {
          api.services[fieldSchema['x-uid']] = result;
        }
      },
      defaultParams: [params],
      refreshDeps: [JSON.stringify(params.appends)],
    },
  );
  return result;
};

export const MaybeCollectionProvider = (props) => {
  const { collection } = props;
  return collection ? (
    <CollectionProvider collection={collection}>
      <ACLCollectionProvider>{props.children}</ACLCollectionProvider>
    </CollectionProvider>
  ) : (
    <>{props.children}</>
  );
};

const BlockRequestProvider = (props) => {
  const field = useField();
  const resource = useBlockResource();
  const service = useResourceAction(
    { ...props, resource },
    {
      ...props.requestOptions,
    },
  );
  const __parent = useContext(BlockRequestContext);
  return (
    <BlockRequestContext.Provider value={{ block: props.block, props, field, service, resource, __parent }}>
      {props.children}
    </BlockRequestContext.Provider>
  );
};

export const useBlockRequestContext = () => {
  return useContext(BlockRequestContext);
};

export const RenderChildrenWithAssociationFilter: React.FC<any> = (props) => {
  const fieldSchema = useFieldSchema();
  const { findComponent } = useDesignable();
  const field = useField();
  const Component = findComponent(field.component?.[0]) || React.Fragment;
  const associationFilterSchema = fieldSchema.reduceProperties((buf, s) => {
    if (s['x-component'] === 'AssociationFilter') {
      return s;
    }
    return buf;
  }, null);

  if (associationFilterSchema) {
    return (
      <Component {...field.componentProps}>
        <Row
          className={css`
            height: 100%;
          `}
          gutter={16}
          wrap={false}
        >
          <Col
            className={css`
              width: 200px;
              flex: 0 0 auto;
            `}
            style={props.associationFilterStyle}
          >
            <RecursionField
              schema={fieldSchema}
              onlyRenderProperties
              filterProperties={(s) => s['x-component'] === 'AssociationFilter'}
            />
          </Col>
          <Col
            className={css`
              flex: 1 1 auto;
              min-width: 0;
            `}
          >
            <div
              className={css`
                display: flex;
                flex-direction: column;
                height: 100%;
              `}
            >
              <RecursionField
                schema={fieldSchema}
                onlyRenderProperties
                filterProperties={(s) => s['x-component'] !== 'AssociationFilter'}
              />
            </div>
          </Col>
        </Row>
      </Component>
    );
  }
  return props.children;
};

export const BlockProvider = (props) => {
  const { collection, association } = props;
  const resource = useResource(props);
  return (
    <MaybeCollectionProvider collection={collection}>
      <BlockAssociationContext.Provider value={association}>
        <BlockResourceContext.Provider value={resource}>
          <BlockRequestProvider {...props}>
            <SharedFilterProvider {...props}>
              <FilterBlockRecord {...props}>{props.children}</FilterBlockRecord>
            </SharedFilterProvider>
          </BlockRequestProvider>
        </BlockResourceContext.Provider>
      </BlockAssociationContext.Provider>
    </MaybeCollectionProvider>
  );
};

export const useBlockAssociationContext = () => {
  return useContext(BlockAssociationContext);
};

export const useFilterByTk = () => {
  const { resource, __parent } = useContext(BlockRequestContext);
  const recordIndex = useRecordIndex();
  const record = useRecord();
  const collection = useCollection();
  const { getCollectionField } = useCollectionManager();
  const assoc = useContext(BlockAssociationContext);
  const withoutTableFieldResource = useContext(WithoutTableFieldResource);
  if (!withoutTableFieldResource) {
    if (resource instanceof TableFieldResource || __parent?.block === 'TableField') {
      return recordIndex;
    }
  }

  if (assoc) {
    const association = getCollectionField(assoc);
    return record?.[association.targetKey || 'id'];
  }
  return record?.[collection.filterTargetKey || 'id'];
};

export const useSourceIdFromRecord = () => {
  const record = useRecord();
  const { getCollectionField } = useCollectionManager();
  const assoc = useContext(BlockAssociationContext);
  if (assoc) {
    const association = getCollectionField(assoc);
    return record?.[association.sourceKey || 'id'];
  }
};

export const useSourceIdFromParentRecord = () => {
  const record = useRecord();
  const { getCollectionField } = useCollectionManager();
  const assoc = useContext(BlockAssociationContext);
  if (assoc) {
    const association = getCollectionField(assoc);
    return record?.__parent?.[association.sourceKey || 'id'];
  }
};

export const useParamsFromRecord = () => {
  const filterByTk = useFilterByTk();
  return {
    filterByTk: filterByTk,
  };
};

export const RecordLink = (props) => {
  const field = useField();
  const record = useRecord();
  const { title, to, ...others } = props;
  const compiled = template(to || '');
  return (
    <Link {...others} to={compiled({ record: record || {} })}>
      {field.title}
    </Link>
  );
};
