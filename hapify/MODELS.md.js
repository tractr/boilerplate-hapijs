let md = `# Models definition\n\n`;

const properties = [
    "primary", "unique", "label", "nullable", "multiple", "important",
    "searchable", "sortable", "hidden", "internal", "restricted", "ownership"
];

for (const model of models) {
    md += `## ${model.names.wordsUpper}\n\n`;
    md += `### Fields\n\n`;
    for (const field of model.fields.list) {
        md += `- ${field.names.wordsUpper}`;
        md += ` [*${field.type}`;
        if (field.type !== 'entity' && field.subtype) {
            md += `:${field.subtype}`;
        }
        if (field.type === 'entity' && field.model) {
            md += `:${field.model.names.upperCamel}`;
        }
        md += `*]`;
        const p = properties.filter(p => !!field[p]);
        if (p.length) {
            md += `: ${p.join(', ')}`;
        }
        md += `\n`;
    }
    md += `\n`;
    if (model.dependencies.list.length) {
        md += `### Dependencies\n\n`;
        md += `${model.dependencies.list.map(d => d.names.wordsUpper).join(', ')}\n\n`;
    }
}

//--------------------------------------------------
//  Output
//--------------------------------------------------
return md;
