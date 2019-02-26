
/**
 * Generate indexes for a model
 *
 * @param out
 * @param model
 * @private
 */
function __model(out, model) {

    const modelName = model.names.underscore;
    const labels = {};
    let hasLabels = false;

    // Even if no fields have indexes, Include this collection
    // Get fields objects
    out[modelName] = model.fields.list.reduce((p, field) => {

        // Non primary fields
        if (field.primary) {
            return p;
        }

        // Only if the field is searchable, sortable a reference or is unique
        if (!(field.sortable || field.searchable || field.type === 'entity' || field.unique)) {
            return p;
        }

        const fieldName = field.names.underscore;

        if (field.label) {
            labels[fieldName] = 'text';
            hasLabels = true;
            return p;
        }

        const object = {
            fields: {
                [fieldName]: 1
            }
        };
        // If the field is unique
        if (field.unique) {
            object.options = {
                unique: true
            }
        }
        p[`${modelName}_${fieldName}`] = object;

        return p;
    }, {});

    if (hasLabels) {
        out[modelName][`${modelName}_labels`] = {
            fields: labels
        };
    }

    return out;
}

//--------------------------------------------------
//  Output
//--------------------------------------------------
const _output = models.reduce(__model, {
    ses_blocked_emails: {
        blocked_emails: {
            fields: {
                email: 1,
                end_timestamp: 1
            }
        }
    },
    assistant_coeff: {
        assistant_coeff_unique: {
            fields: {
                input_field_name: 1,
                input_field_value: 1,
                output_field_name: 1,
                output_field_values: 1
            },
            options: {
                unique: true
            }
        },
        assistant_coeff_input_field_name: {
            fields: {
                input_field_name: 1
            }
        },
        assistant_coeff_input_field_value: {
            fields: {
                input_field_value: 1
            }
        },
        assistant_coeff_output_field_name: {
            fields: {
                output_field_name: 1
            }
        },
        assistant_coeff_output_field_values: {
            fields: {
                output_field_values: 1
            }
        },
        assistant_coeff_coeff: {
            fields: {
                coeff: 1
            }
        }
    }
});
return JSON.stringify(_output, null, 4);
