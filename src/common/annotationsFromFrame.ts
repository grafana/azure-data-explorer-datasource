import { AnnotationEvent, DataFrame, FieldType, Field, KeyValue } from '@grafana/data';

interface AnnotationEventNames {
  userId?: string;
  login?: string;
  email?: string;
  avatarUrl?: string;
  time?: string; // or first time
  timeEnd?: string;
  title?: string;
  text?: string; // or first string
  tags?: string; // Split on ','
}

const defaultAnnotationEventFinder: AnnotationEventNames = {
  userId: 'userId',
  login: 'login',
  email: 'email',
  avatarUrl: 'avatarUrl',
  time: 'time',
  timeEnd: 'timeEnd',
  title: 'title',
  text: 'text',
  tags: 'tags',
};

interface AnnotationEventFieldSetter {
  key: string;
  field: Field;

  regex?: RegExp; // for text
  split?: string; // for tags
}

export interface AnnotationsFromFrameOptions {
  field?: AnnotationEventNames;
  regex?: AnnotationEventNames;
}

export function getAnnotationsFromFrame(frame: DataFrame, options?: AnnotationsFromFrameOptions): AnnotationEvent[] {
  const events: AnnotationEvent[] = [];
  if (!frame || !frame.length) {
    return events;
  }

  let hasTime = false;
  let hasText = false;
  const byName: KeyValue<Field> = {};
  for (const f of frame.fields) {
    byName[f.name.toLowerCase()] = f;
  }

  const fields: AnnotationEventFieldSetter[] = [];
  const finder: AnnotationEventNames = {
    ...defaultAnnotationEventFinder,
    ...options?.field,
  };
  for (const [key, value] of Object.entries(finder)) {
    const lower = value ? value.toLowerCase() : '';
    if (lower && byName[lower]) {
      const v: AnnotationEventFieldSetter = {
        key,
        field: byName[lower],
      };
      switch (key) {
        case 'time':
          hasTime = true;
          break;
        case 'text':
          hasText = true;
          break;
        case 'tags':
          v.split = ',';
          break;
      }
      if (options?.regex && options.regex[key]) {
        v.regex = new RegExp(options.regex[key]);
      }
      fields.push(v);
    }
  }
  if (!hasTime) {
    const field = frame.fields.find(f => f.type === FieldType.time);
    if (!field) {
      return [];
    }
    fields.push({
      key: 'time',
      field,
    });
  }

  if (!hasText) {
    const field = frame.fields.find(f => f.type === FieldType.string);
    if (!field) {
      return [];
    }
    if (options?.regex?.text) {
      fields.push({
        key: 'time',
        field,
        regex: new RegExp(options.regex.text),
      });
    } else {
      fields.push({
        key: 'time',
        field,
      });
    }
  }

  // Add each value to the string
  for (let i = 0; i < frame.length; i++) {
    const anno: AnnotationEvent = {};
    for (const f of fields) {
      let v = f.field.values.get(i);
      if (f.regex) {
        const match = f.regex.exec(v);
        if (match) {
          v = match[1] ? match[1] : match[0];
        }
      }
      if (f.split) {
        v = (v as string).split(',');
      }
      anno[f.key] = v;
    }
    events.push(anno);
  }

  return events;
}
