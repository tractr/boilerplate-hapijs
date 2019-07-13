
/**
 * Generate indexes for a model
 *
 * @param out
 * @param model
 * @private
 */
function __model(out, model) {

    const modelName = model.names.snake;
    
    const labels = { fields: {} };
    const uniques = {
        fields: {},
        options: { unique: true }
    };
    

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

        const fieldName = field.names.snake;

        // Special index for labels
        if (field.label) {
            labels.fields[fieldName] = 'text';
        }
        
        // Normal indexes
        p[`${modelName}_${fieldName}`] = { fields: { [fieldName]: 1 } };
        
        if (field.unique) {
            p[`${modelName}_${fieldName}`].options = { unique: true };
            uniques.fields[fieldName] = 1;
        }

        return p;
    }, {});
    
    // Add labels
    if (Object.keys(labels.fields).length > 0) {
        out[modelName][`${modelName}__labels`] = labels;
    }
    
    // Optimize unique indexes
    if (Object.keys(uniques.fields).length > 1) {
        // Remove unique from other indexes
        model.fields.unique.map(field => {
            const fieldName = field.names.snake;
            if (out[modelName][`${modelName}_${fieldName}`]) {
                delete out[modelName][`${modelName}_${fieldName}`].options;
            }
        });
        // Add unique
        out[modelName][`${modelName}__uniques`] = uniques;
    }

    return out;
}

//--------------------------------------------------
//  Output
//--------------------------------------------------
const _output = models.reduce(__model, {});
return JSON.stringify(_output, null, 4);
