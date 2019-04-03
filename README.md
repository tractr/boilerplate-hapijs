# HapiJS Boilerplate

#### Hapify
This boilerplate is meant to be used with Hapify. To get more info about Hapify setup, please refer to https://www.hapify.io/get-started.

#### Stack

This boilerplate provides an API built with HapiJS, MongoDB and Docker.

## Get Started

### 1. Clone repository

- **Option 1**: Clone and configure this boilerplate using command `hpf new --boilerplate hapijs_tractr`.
- **Option 2**: You can clone this repository and change the project id in file `hapify.json` by running command `hpf use`.

### 2. Generate code

Then you need to generate code from your Hapify project using `hpf generate`.

**Important**: For development purpose, generated files are ignored in the `.gitignore`. You should edit this file and remove the last lines before committing.

### 3. Run the API

This API should be used with docker and docker-compose.

#### 3.1 Installation

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

#### 3.2 Start server

To start the API, run this command

```bash
docker-compose up api
```

Now the API is available on `http://localhost:3000`.

#### 3.3 Insert development data

To insert randomized data into the database, run this command

```bash
docker-compose run --rm api npm run cmd populate
```

#### 3.4 Updates

If you need to update you data models and re-generate code (using [Hapify](https://www.hapify.io/), you should:

- 1. Run this command `docker-compose run --rm api npm run cmd setup` to update the MongoDb indexes.
- 2. Restart the API.

Please refer to [Hapify Best Practices](https://www.hapify.io/documentation/best-practices) to learn more about Git patches within Hapify Context.


## Documentation

Once the API is started, you can access http://localhost:3000/docs to browse the documentation.


## Advanced Integration

This boilerplate includes the following modules

- user sessions
- users accesses management


## Models interpretation

This boilerplate interpretes [Hapify](https://www.hapify.io/) data-models fields properties as described bellow:

- **Primary**: Represent the MongoDB Id.
- **Unique**: Creates an unique index for MongoDB and throw a 409 in case of conflict.
- **Label**: Creates a text index for MongoDB and allow partial match search for this field.
- **Nullable**: Allow null to be send for POST and PATCH endpoints.
- **Multiple**: Only used for entity relation for One-to-Many relation. If also searchable, it performs search using operator `$all`.
- **Embedded**: Only used for entity relation. It joins related entities in search results. Related entities are always joined in a read response.
- **Searchable**: Allows this field in query params for search and count endpoints. If the field is also a `DateTime` or a `Number`, it adds `min` and `max` query params. It also creates an index for MongoDB.
- **Sortable**: allows this field's name as value in the query param `_sort` of the endpoint search. Also create an index for MongoDB.
- **Hidden**: Adds projection when getting the data from MongoDB to remove this field. On create route, it deletes the fields before returning the response.
- **Internal**: This field won't be allowed in POST and PATCH endpoints. It tries to guess a suitable value for this field. You may need to edit this default value after code generation.
- **Restricted**: This field is allowed in POST and PATCH endpoints only for admins. An admin is a user with the field `role='admin'`.
- **Ownership**: This field is used to allow the request when the access of the action is made by an `owner`. The value of the field is compared to the connected user id. For search and count endpoints, if also searchable, it forces to perform the lookup in the owner's documents.
