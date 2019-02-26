
const _output = models.map((m) => {
    return {
        collection: m.names.underscore,
        dependencies: m.dependencies.list.map((d) => {
            return d.names.underscore
        }),
        fields: m.fields.list.map((f) => {
            const out = Object.assign({}, f);
            out.name = out.names.underscore;
            delete out.names;
            if (out.model) {
                out.reference = out.model.names.underscore;
                delete out.m;
                delete out.model;
            }
            return out;
        })
    };
});

//--------------------------------------------------
//  Output
//--------------------------------------------------
return JSON.stringify(_output, null, 4);
