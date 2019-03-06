'use strict';

// Errors bucket
const errors = [];
const warnings = [];

// Model object is injected as "model"

// ###########################################################
//  ROUTES
// ###########################################################
// -----------------------------
// Primary key
const primaries = model.fields.filter((f) => f.primary);
if (primaries.length > 1) {
    errors.push('[Routes] Only one field can be primary');
}
const primary = primaries[0];
if (primary) {

    if (primary.name !== '_id') {
        errors.push('[Routes] Primary key must be called "_id"');
    }
    if (primary.type !== 'string') {
        errors.push('[Routes] Primary key must be a string');
    }
    if (!primary.internal) {
        errors.push('[Routes] Primary key must be a internal');
    }
    if (primary.nullable) {
        errors.push('[Routes] Primary key cannot be nullable');
    }
    if (primary.multiple) {
        errors.push('[Routes] Primary key cannot be multiple');
    }
    if (primary.hidden) {
        errors.push('[Routes] Primary key cannot be private');
    }
    if (primary.searchable) {
        errors.push('[Routes] Primary key cannot be searchable');
    }

    if (primary.unique) {
        warnings.push('[Routes] Primary key as unique will be ignored');
    }
    if (primary.label) {
        warnings.push('[Routes] Primary key as label will be ignored');
    }
} else {
    errors.push('[Routes] Primary key is required');
}

// -----------------------------
// Multiple fields
if (model.fields.filter((f) => f.multiple && f.type !== 'entity').length) {
    errors.push('[Routes] Multiple fields can only be entities references');
}

// -----------------------------
// Important fields
if (model.fields.filter((f) => f.important && f.type !== 'entity').length) {
    errors.push('[Routes] Important fields can only be entities references');
}
if (model.fields.filter((f) => f.important && f.hidden).length) {
    errors.push('[Routes] Important fields cannot be private');
}

// -----------------------------
// Password fields
if (model.fields.filter((f) => f.type === 'string' && f.subtype === 'password' && !f.hidden).length) {
    warnings.push('[Routes] Passwords should be private');
}

// -----------------------------
// Restricted fields
if (model.fields.filter((f) => f.restricted && f.internal).length) {
    warnings.push('[Routes] A fields cannot be internal and restricted');
}

// -----------------------------
// Owner fields
if (model.fields.filter((f) => f.ownership).length > 1) {
    errors.push('[Routes] Only one field can be ownership');
}
if (model.fields.filter((f) => f.ownership && f.type !== 'entity' && !f.primary).length > 0) {
    errors.push('[Routes] Ownership field must be an entity');
}
if (model.fields.filter((f) => f.ownership && !f.primary).length && model.accesses.create === 'guest') {
    errors.push('[Routes] Model with ownership cannot be created as guest');
}
let hasOwnerAccess = false;
for (const action in model.accesses) {
    if (model.accesses[action] === 'owner') {
        hasOwnerAccess = true;
        break;
    }
}
if (hasOwnerAccess && model.fields.filter((f) => f.ownership).length === 0) {
    errors.push('[Routes] Model with owner access must have a ownership field');
}

// -----------------------------
// Accesses
if ((model.accesses.search === 'owner' || model.accesses.count === 'owner') && model.accesses.search !== model.accesses.count) {
    errors.push('[Routes] Search and count actions access must be both "owner" or none.');
}

// ###########################################################
//  TESTS
// ###########################################################
// -----------------------------
// Nullable fields
if (model.fields.filter((f) => f.nullable && f.internal && f.searchable).length) {
    warnings.push('[Tests] Nullable, internal and searchable fields will cause testing errors due to default value set as null.');
}
// Restrcited VS admin create
if (model.accesses.create === 'admin' && model.fields.filter((f) => f.restricted).length) {
    warnings.push('[Tests] Models, created by admins, with restricted fields will cause testing errors.');
}

// ###########################################################
//  MONGO
// ###########################################################
// -----------------------------
// Multiple fields
if (model.fields.filter((f) => f.label && f.type !== 'string').length) {
    errors.push('[MongoDB] Label fields can only be string');
}
// -----------------------------
// Unique fields
if (model.fields.filter((f) => f.unique && f.label).length) {
    warnings.push('[MongoDB] Index for label will not be unique');
}


return {
    errors,
    warnings,
};
