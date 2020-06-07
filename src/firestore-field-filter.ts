// https://gist.github.com/christianlacerda/8de3de6af5862c63f02db6f3eaa9334a
import * as admin from 'firebase-admin';

import {Change, EventContext} from 'firebase-functions';
import {isEqual} from 'lodash';
import DocumentSnapshot = admin.firestore.DocumentSnapshot;
import FieldPath = admin.firestore.FieldPath;

const isEquivalent = (before: any, after: any) => {
    return before && typeof before.isEqual === 'function'
        ? before.isEqual(after)
        : isEqual(before, after);
};

const conditions = {
    CHANGED: (fieldBefore: any, fieldAfter: any) =>
        fieldBefore !== undefined &&
        fieldAfter !== undefined &&
        !isEquivalent(fieldBefore, fieldAfter),

    ADDED: (fieldBefore: any, fieldAfter: any) =>
        fieldBefore === undefined && fieldAfter,

    REMOVED: (fieldBefore: any, fieldAfter: any) =>
        fieldBefore && fieldAfter === undefined,

    WRITTEN: (fieldBefore: any, fieldAfter: any) =>
        (fieldBefore === undefined && fieldAfter) ||
        (fieldBefore && fieldAfter === undefined) ||
        !isEquivalent(fieldBefore, fieldAfter)
};

const field = (
    fieldPath: string | FieldPath,
    operation: 'ADDED' | 'REMOVED' | 'CHANGED' | 'WRITTEN',
    handler: (
        change: Change<DocumentSnapshot>,
        context: EventContext,
    ) => PromiseLike<any> | any,
) => {
    return function (change: Change<DocumentSnapshot>, context: EventContext) {
        const fieldBefore = change.before.get(fieldPath);
        const fieldAfter = change.after.get(fieldPath);
        return conditions[operation](fieldBefore, fieldAfter)
            ? handler(change, context)
            : Promise.resolve();
    };
};

export default field;