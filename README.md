# HapiJS Boilerplate

This boilerplate is meant to be used with Hapify. To get more info about Hapify setup, please refer to https://www.hapify.io/get-started.

## Stack

This boilerplate provides an API built with HapiJS, MongoDB and Docker.

## Boilerplate

### Clone repository

#### Option 1

Clone and configure this boilerplate using command `hpf new --boilerplate tractr-hapijs`.

#### Option 2

You can clone this repository and change the project id in file `hapify.json` by running command `hpf use`.

### Generate code

Then you need to generate code from your Hapify project using `hpf generate`.

## Start API

This API should be used with docker and docker-compose.

### Installation

Run installation scripts to create MongoDB indexes and insert an admin:

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

## Documentation

Once the API is started, you can access http://localhost:3000/docs to browse its documentation.

## Updates

If you need to update you data models and re-generate code, you should run this command `docker-compose run --rm api npm run cmd setup`
to update the MongoDb indexes.
You should also restart the API.

## Integration

This boilerplate includes a user sessions and users accesses management.
