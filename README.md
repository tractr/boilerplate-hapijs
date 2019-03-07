# HapiJS Boilerplate

This boilerplate is meant to be used with Hapify. To get more info about Hapify setup, please refer to https://www.hapify.io/get-started.

## Stack

This boilerplate provides an API built with HapiJS, MongoDB and Docker.

## Boilerplate

### Clone repository

#### Option 1

Clone and configure this boilerplate using command `hpf new --boilerplate hapijs_tractr`.

#### Option 2

You can clone this repository and change the project id in file `hapify.json` by running command `hpf use`.

### Generate code

Then you need to generate code from your Hapify project using `hpf generate`.

## Start API

This API should be used with docker and docker-compose.

### Installation

Run installation scripts to create MongoDB indexes and insert an admin:

```bash
docker-compose run --rm api npm install
```

```bash
docker-compose run --rm api npm run cmd setup
```

```bash
docker-compose run --rm api npm run cmd insert-admin
```

To login of the admin user is defined in file `cmd/insert-admin/admin.js`

### Start server

To start the API, run this command

```bash
docker-compose up api
```

Now the API is available on `http://localhost:3000`.

### Development data

To insert randomized data into the database, run this command

```bash
docker-compose run --rm api npm run cmd populate
```

## Documentation

Once the API is started, you can access http://localhost:3000/docs to browse its documentation.

## Updates

If you need to update you data models and re-generate code, you should run this command `docker-compose run --rm api npm run cmd setup`
to update the MongoDb indexes.
You should also restart the API.

## Integration

This boilerplate includes a user sessions and users accesses management.

## Models interpretation

Here is the interpretations of fields properties by this boilerplate:

### Primary 

Represent the MongoDB Id.

### Unique

Will create an unique index for MongoDB and throw a 409 in case of conflict.

### Label

Will create a text index for MongoDB and allow partial match search for this field.

### Nullable

Allow null to be send for POST and PATCH endpoints.

### Multiple

Only used for entity relation for One-to-Many relation.
If also searchable, it will perform search using operator `$all`.

### Embedded

Only used for entity relation.
It will join related entities in search results.
Related entities are always joined in a read response.

### Searchable

Will allow this field in query params for search and count endpoints.
If the field is also a `DateTime` or a `Number`, it will add `min` and `max` query params.

It will also create an index for MongoDB.

### Sortable

Will allow this field's name as value in the query param `_sort` of the endpoint search.

It will also create an index for MongoDB.

### Hidden

This will add projection when getting the data from MongoDB to remove this field.
On create route, it will delete the fields before returning the response.

### Internal

This field won't be allowed in POST and PATCH endpoints.
Will try to guess a suitable value for this field.
You may need to edit this default value after generation.

### Restricted

This field is allowed in POST and PATCH endpoints only for admins.
An admin is a user with the field `role='admin'`.

### Ownership

This field will be used to allow the request when the access of the action is `owner`.
The value of the field will be compare to the connected user id.
For search and count endpoints, if also searchable, it will force to perform the lookup in the owner's documents.
