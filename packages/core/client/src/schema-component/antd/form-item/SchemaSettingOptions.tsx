import { ArrayCollapse, FormLayout } from '@formily/antd';
import { Field } from '@formily/core';
import { ISchema, useField, useFieldSchema } from '@formily/react';
import { uid } from '@formily/shared';
import _ from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFilterByTk, useFormBlockContext } from '../../../block-provider';
import { useCollection, useCollectionManager } from '../../../collection-manager';
import { SchemaSettings } from '../../../schema-settings';
import { useCompile, useDesignable, useFieldComponentOptions } from '../../hooks';
import { useOperatorList } from '../filter/useOperators';

const findFilterOperators = (fieldSchema) => {
  while (fieldSchema) {
    if (fieldSchema['x-filter-operators']) {
      return {
        operators: fieldSchema['x-filter-operators'],
        uid: fieldSchema['x-uid'],
      };
    }
    fieldSchema = fieldSchema.parent;
  }
  return {};
};

const divWrap = (schema: ISchema) => {
  return {
    type: 'void',
    'x-component': 'div',
    properties: {
      [schema.name || uid()]: schema,
    },
  };
};

export const EditTitle = () => {
  const { getCollectionJoinField } = useCollectionManager();
  const { getField } = useCollection();
  const field = useField<Field>();
  const fieldSchema = useFieldSchema();
  const { t } = useTranslation();
  const { dn } = useDesignable();
  const collectionField = getField(fieldSchema['name']) || getCollectionJoinField(fieldSchema['x-collection-field']);

  return (
    collectionField && (
      <SchemaSettings.ModalItem
        key="edit-field-title"
        title={t('Edit field title')}
        schema={
          {
            type: 'object',
            title: t('Edit field title'),
            properties: {
              title: {
                title: t('Field title'),
                default: field?.title,
                description: `${t('Original field title: ')}${collectionField?.uiSchema?.title}`,
                'x-decorator': 'FormItem',
                'x-component': 'Input',
                'x-component-props': {},
              },
            },
          } as ISchema
        }
        onSubmit={({ title }) => {
          if (title) {
            field.title = title;
            fieldSchema.title = title;
            dn.emit('patch', {
              schema: {
                'x-uid': fieldSchema['x-uid'],
                title: fieldSchema.title,
              },
            });
          }
          dn.refresh();
        }}
      />
    )
  );
};

export const EditDescription = () => {
  const field = useField<Field>();
  const fieldSchema = useFieldSchema();
  const { t } = useTranslation();
  const { dn } = useDesignable();

  return !field.readPretty ? (
    <SchemaSettings.ModalItem
      key="edit-description"
      title={t('Edit description')}
      schema={
        {
          type: 'object',
          title: t('Edit description'),
          properties: {
            description: {
              // title: t('Description'),
              default: field?.description,
              'x-decorator': 'FormItem',
              'x-component': 'Input.TextArea',
              'x-component-props': {},
            },
          },
        } as ISchema
      }
      onSubmit={({ description }) => {
        field.description = description;
        fieldSchema.description = description;
        dn.emit('patch', {
          schema: {
            'x-uid': fieldSchema['x-uid'],
            description: fieldSchema.description,
          },
        });
        dn.refresh();
      }}
    />
  ) : null;
};

export const EditTooltip = () => {
  const field = useField<Field>();
  const fieldSchema = useFieldSchema();
  const { t } = useTranslation();
  const { dn } = useDesignable();

  return field.readPretty ? (
    <SchemaSettings.ModalItem
      key="edit-tooltip"
      title={t('Edit tooltip')}
      schema={
        {
          type: 'object',
          title: t('Edit description'),
          properties: {
            tooltip: {
              default: fieldSchema?.['x-decorator-props']?.tooltip,
              'x-decorator': 'FormItem',
              'x-component': 'Input.TextArea',
              'x-component-props': {},
            },
          },
        } as ISchema
      }
      onSubmit={({ tooltip }) => {
        field.decoratorProps.tooltip = tooltip;
        fieldSchema['x-decorator-props'] = fieldSchema['x-decorator-props'] || {};
        fieldSchema['x-decorator-props']['tooltip'] = tooltip;
        dn.emit('patch', {
          schema: {
            'x-uid': fieldSchema['x-uid'],
            'x-decorator-props': fieldSchema['x-decorator-props'],
          },
        });
        dn.refresh();
      }}
    />
  ) : null;
};

export const EditRequired = () => {
  const field = useField<Field>();
  const fieldSchema = useFieldSchema();
  const { t } = useTranslation();
  const { dn, refresh } = useDesignable();

  return !field.readPretty && fieldSchema['x-component'] !== 'FormField' ? (
    <SchemaSettings.SwitchItem
      key="required"
      title={t('Required')}
      checked={fieldSchema.required as boolean}
      onChange={(required) => {
        const schema = {
          ['x-uid']: fieldSchema['x-uid'],
        };
        field.required = required;
        fieldSchema['required'] = required;
        schema['required'] = required;
        dn.emit('patch', {
          schema,
        });
        refresh();
      }}
    />
  ) : null;
};

export const EditValidationRules = () => {
  const { getInterface, getCollectionJoinField } = useCollectionManager();
  const { getField } = useCollection();
  const { form } = useFormBlockContext();
  const field = useField<Field>();
  const fieldSchema = useFieldSchema();
  const { t } = useTranslation();
  const { dn, refresh } = useDesignable();
  const collectionField = getField(fieldSchema['name']) || getCollectionJoinField(fieldSchema['x-collection-field']);
  const interfaceConfig = getInterface(collectionField?.interface);
  const validateSchema = interfaceConfig?.['validateSchema']?.(fieldSchema);

  return form && !form?.readPretty && validateSchema ? (
    <SchemaSettings.ModalItem
      title={t('Set validation rules')}
      components={{ ArrayCollapse, FormLayout }}
      schema={
        {
          type: 'object',
          title: t('Set validation rules'),
          properties: {
            rules: {
              type: 'array',
              default: fieldSchema?.['x-validator'],
              'x-component': 'ArrayCollapse',
              'x-decorator': 'FormItem',
              'x-component-props': {
                accordion: true,
              },
              maxItems: 3,
              items: {
                type: 'object',
                'x-component': 'ArrayCollapse.CollapsePanel',
                'x-component-props': {
                  header: '{{ t("Validation rule") }}',
                },
                properties: {
                  index: {
                    type: 'void',
                    'x-component': 'ArrayCollapse.Index',
                  },
                  layout: {
                    type: 'void',
                    'x-component': 'FormLayout',
                    'x-component-props': {
                      labelStyle: {
                        marginTop: '6px',
                      },
                      labelCol: 8,
                      wrapperCol: 16,
                    },
                    properties: {
                      ...validateSchema,
                      message: {
                        type: 'string',
                        title: '{{ t("Error message") }}',
                        'x-decorator': 'FormItem',
                        'x-component': 'Input.TextArea',
                        'x-component-props': {
                          autoSize: {
                            minRows: 2,
                            maxRows: 2,
                          },
                        },
                      },
                    },
                  },
                  remove: {
                    type: 'void',
                    'x-component': 'ArrayCollapse.Remove',
                  },
                  moveUp: {
                    type: 'void',
                    'x-component': 'ArrayCollapse.MoveUp',
                  },
                  moveDown: {
                    type: 'void',
                    'x-component': 'ArrayCollapse.MoveDown',
                  },
                },
              },
              properties: {
                add: {
                  type: 'void',
                  title: '{{ t("Add validation rule") }}',
                  'x-component': 'ArrayCollapse.Addition',
                  'x-reactions': {
                    dependencies: ['rules'],
                    fulfill: {
                      state: {
                        disabled: '{{$deps[0].length >= 3}}',
                      },
                    },
                  },
                },
              },
            },
          },
        } as ISchema
      }
      onSubmit={(v) => {
        const rules = [];
        for (const rule of v.rules) {
          rules.push(_.pickBy(rule, _.identity));
        }
        const schema = {
          ['x-uid']: fieldSchema['x-uid'],
        };
        // return;
        // if (['number'].includes(collectionField?.interface) && collectionField?.uiSchema?.['x-component-props']?.['stringMode'] === true) {
        //   rules['numberStringMode'] = true;
        // }
        if (['percent'].includes(collectionField?.interface)) {
          for (const rule of rules) {
            if (!!rule.maxValue || !!rule.minValue) {
              rule['percentMode'] = true;
            }

            if (rule.percentFormat) {
              rule['percentFormats'] = true;
            }
          }
        }
        const concatValidator = _.concat([], collectionField?.uiSchema?.['x-validator'] || [], rules);
        field.validator = concatValidator;
        fieldSchema['x-validator'] = rules;
        schema['x-validator'] = rules;
        dn.emit('patch', {
          schema,
        });
        refresh();
      }}
    />
  ) : null;
};

export const EditDefaultValue = () => {
  const { getCollectionJoinField } = useCollectionManager();
  const { getField } = useCollection();
  const { form } = useFormBlockContext();
  const field = useField<Field>();
  const fieldSchema = useFieldSchema();
  const { t } = useTranslation();
  const { dn, refresh } = useDesignable();
  const collectionField = getField(fieldSchema['name']) || getCollectionJoinField(fieldSchema['x-collection-field']);

  return form && !form?.readPretty && collectionField?.uiSchema?.type ? (
    <SchemaSettings.ModalItem
      title={t('Set default value')}
      components={{ ArrayCollapse, FormLayout }}
      schema={
        {
          type: 'object',
          title: t('Set default value'),
          properties: {
            default: {
              ...collectionField.uiSchema,
              name: 'default',
              title: t('Default value'),
              'x-decorator': 'FormItem',
              default: fieldSchema.default || collectionField.defaultValue,
            },
          },
        } as ISchema
      }
      onSubmit={(v) => {
        const schema: ISchema = {
          ['x-uid']: fieldSchema['x-uid'],
        };
        if (field.value !== v.default) {
          field.value = v.default;
        }
        fieldSchema.default = v.default;
        schema.default = v.default;
        dn.emit('patch', {
          schema,
        });
        refresh();
      }}
    />
  ) : null;
};

export const EditComponent = () => {
  const { getInterface, getCollectionJoinField } = useCollectionManager();
  const { getField } = useCollection();
  const tk = useFilterByTk();
  const { form } = useFormBlockContext();
  const field = useField<Field>();
  const fieldSchema = useFieldSchema();
  const { t } = useTranslation();
  const { dn, insertAdjacent } = useDesignable();
  const collectionField = getField(fieldSchema['name']) || getCollectionJoinField(fieldSchema['x-collection-field']);
  const interfaceConfig = getInterface(collectionField?.interface);
  const fieldComponentOptions = useFieldComponentOptions();
  const isSubFormAssocitionField = field.address.segments.includes('__form_grid');

  return form && !isSubFormAssocitionField && fieldComponentOptions ? (
    <SchemaSettings.SelectItem
      title={t('Field component')}
      options={fieldComponentOptions}
      value={fieldSchema['x-component']}
      onChange={(type) => {
        const schema: ISchema = {
          name: collectionField.name,
          type: 'void',
          required: fieldSchema['required'],
          description: fieldSchema['description'],
          default: fieldSchema['default'],
          'x-decorator': 'FormItem',
          'x-designer': 'FormItem.Designer',
          'x-component': type,
          'x-validator': fieldSchema['x-validator'],
          'x-collection-field': fieldSchema['x-collection-field'],
          'x-decorator-props': fieldSchema['x-decorator-props'],
          'x-component-props': {
            ...collectionField?.uiSchema?.['x-component-props'],
            ...fieldSchema['x-component-props'],
          },
        };

        interfaceConfig?.schemaInitialize?.(schema, {
          field: collectionField,
          block: 'Form',
          readPretty: field.readPretty,
          action: tk ? 'get' : null,
        });

        insertAdjacent('beforeBegin', divWrap(schema), {
          onSuccess: () => {
            dn.remove(null, {
              removeParentsIfNoChildren: true,
              breakRemoveOn: {
                'x-component': 'Grid',
              },
            });
          },
        });
      }}
    />
  ) : null;
};

export const EditPattern = () => {
  const { getCollectionJoinField } = useCollectionManager();
  const { getField } = useCollection();
  const { form } = useFormBlockContext();
  const field = useField<Field>();
  const fieldSchema = useFieldSchema();
  const { t } = useTranslation();
  const { dn } = useDesignable();
  const collectionField = getField(fieldSchema['name']) || getCollectionJoinField(fieldSchema['x-collection-field']);
  let readOnlyMode = 'editable';
  if (fieldSchema['x-disabled'] === true) {
    readOnlyMode = 'readonly';
  }
  if (fieldSchema['x-read-pretty'] === true) {
    readOnlyMode = 'read-pretty';
  }

  return form &&
    !form?.readPretty &&
    collectionField?.interface !== 'o2m' &&
    fieldSchema?.['x-component-props']?.['pattern-disable'] != true ? (
    <SchemaSettings.SelectItem
      key="pattern"
      title={t('Pattern')}
      options={[
        { label: t('Editable'), value: 'editable' },
        { label: t('Readonly'), value: 'readonly' },
        { label: t('Easy-reading'), value: 'read-pretty' },
      ]}
      value={readOnlyMode}
      onChange={(v) => {
        const schema: ISchema = {
          ['x-uid']: fieldSchema['x-uid'],
        };

        switch (v) {
          case 'readonly': {
            fieldSchema['x-read-pretty'] = false;
            fieldSchema['x-disabled'] = true;
            schema['x-read-pretty'] = false;
            schema['x-disabled'] = true;
            field.readPretty = false;
            field.disabled = true;
            break;
          }
          case 'read-pretty': {
            fieldSchema['x-read-pretty'] = true;
            fieldSchema['x-disabled'] = false;
            schema['x-read-pretty'] = true;
            schema['x-disabled'] = false;
            field.readPretty = true;
            break;
          }
          default: {
            fieldSchema['x-read-pretty'] = false;
            fieldSchema['x-disabled'] = false;
            schema['x-read-pretty'] = false;
            schema['x-disabled'] = false;
            field.readPretty = false;
            field.disabled = false;
            break;
          }
        }

        dn.emit('patch', {
          schema,
        });

        dn.refresh();
      }}
    />
  ) : null;
};

export const EditOperator = () => {
  const compile = useCompile();
  const field = useField<Field>();
  const fieldSchema = useFieldSchema();
  const { t } = useTranslation();
  const { dn } = useDesignable();
  const operatorList = useOperatorList();
  const { operators: storedOperators, uid } = findFilterOperators(fieldSchema);

  if (operatorList.length && !storedOperators[fieldSchema.name]) {
    storedOperators[fieldSchema.name] = operatorList[0].value;
  }

  return operatorList.length ? (
    <SchemaSettings.SelectItem
      key="operator"
      title={t('Operator')}
      value={storedOperators[fieldSchema.name]}
      options={compile(operatorList)}
      onChange={(v) => {
        storedOperators[fieldSchema.name] = v;
        const schema: ISchema = {
          ['x-uid']: uid,
          ['x-filter-operators']: storedOperators,
        };
        dn.emit('patch', {
          schema,
        });
        dn.refresh();
      }}
    />
  ) : null;
};

export const EditTitleField = () => {
  const { getCollectionFields, getCollectionJoinField } = useCollectionManager();
  const { getField } = useCollection();
  const field = useField<Field>();
  const fieldSchema = useFieldSchema();
  const { t } = useTranslation();
  const { dn } = useDesignable();
  const compile = useCompile();
  const collectionField = getField(fieldSchema['name']) || getCollectionJoinField(fieldSchema['x-collection-field']);
  const targetFields = collectionField?.target
    ? getCollectionFields(collectionField.target)
    : getCollectionFields(collectionField?.targetCollection) ?? [];
  const options = targetFields
    .filter((field) => !field?.target && field.type !== 'boolean')
    .map((field) => ({
      value: field?.name,
      label: compile(field?.uiSchema?.title) || field?.name,
    }));

  return options.length > 0 && fieldSchema['x-component'] === 'CollectionField' ? (
    <SchemaSettings.SelectItem
      key="title-field"
      title={t('Title field')}
      options={options}
      value={field?.componentProps?.fieldNames?.label}
      onChange={(label) => {
        const schema = {
          ['x-uid']: fieldSchema['x-uid'],
        };
        const fieldNames = {
          ...collectionField?.uiSchema?.['x-component-props']?.['fieldNames'],
          ...field.componentProps.fieldNames,
          label,
        };
        fieldSchema['x-component-props'] = fieldSchema['x-component-props'] || {};
        fieldSchema['x-component-props']['fieldNames'] = fieldNames;
        schema['x-component-props'] = fieldSchema['x-component-props'];
        dn.emit('patch', {
          schema,
        });
        dn.refresh();
      }}
    />
  ) : null;
};
