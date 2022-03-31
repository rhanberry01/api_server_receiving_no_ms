'use strict'

/** @type {import('@adonisjs/framework/src/Env')} */
const Env = use('Env')
/** @type {import('@adonisjs/ignitor/src/Helpers')} */
const Helpers = use('Helpers')


module.exports = {
  /*
  |--------------------------------------------------------------------------
  | Default Connection
  |--------------------------------------------------------------------------
  |
  | Connection defines the default connection settings to be used while
  | interacting with SQL databases.
  |
  */
  connection: Env.get('DB_CONNECTION', 'sqlite'),

  /*
  |--------------------------------------------------------------------------
  | Sqlite
  |--------------------------------------------------------------------------
  |
  | Sqlite is a flat file database and can be a good choice for a development
  | environment.
  |
  | npm i --save sqlite3
  |
  */
  sqlite: {
    client: 'sqlite3',
    connection: {
      filename: Helpers.databasePath(`${Env.get('DB_DATABASE', 'development')}.sqlite`)
    },
    useNullAsDefault: true,
    debug: Env.get('DB_DEBUG', false)
  },

  /*
  |--------------------------------------------------------------------------
  | MySQL
  |--------------------------------------------------------------------------
  |
  | Here we define connection settings for MySQL database.
  |
  | npm i --save mysql
  |
  */
  mysql: {
    client: 'mysql',
    connection: {
      host: Env.get('DB_HOST', 'localhost'),
      port: Env.get('DB_PORT', ''),
      user: Env.get('DB_USER', 'root'),
      password: Env.get('DB_PASSWORD', ''),
      database: Env.get('DB_DATABASE', 'adonis')
    },
    debug: Env.get('DB_DEBUG', false)
  },
  return_merchandise: {
    client: 'mysql',
    connection: {
      host: Env.get('DB_HOST', 'localhost'),
      port: Env.get('DB_PORT', ''),
      user: Env.get('DB_USER', 'root'),
      password: Env.get('DB_PASSWORD', ''), 
      database: Env.get('DB_DATABASE_RS', 'returned_merchandise')
    },
    debug: Env.get('DB_DEBUG', false)
  },
  receiving_new: {
    client: 'mysql',
    connection: {
      host: Env.get('DB_HOST', 'localhost'),
      port: Env.get('DB_PORT', ''),
      user: Env.get('DB_USER', 'root'),
      password: Env.get('DB_PASSWORD', ''),
      database: Env.get('DB_DATABASE_RECEIVING', 'receiving_new_caravan')
    },
    debug: Env.get('DB_DEBUG', false)
  },
  transfers: {
    client: 'mysql',
    connection: {
      host: Env.get('DB_HOST_TRANSFERS', 'localhost'),
      port: Env.get('DB_PORT_TRANSFERS', ''),
      user: Env.get('DB_USER_TRANSFERS', 'root'),
      password: Env.get('DB_PASSWORD_TRANSFERS', ''),
      database: Env.get('DB_DATABASE_TRANSFERS', 'transfers_caravan')
    },
    debug: Env.get('DB_DEBUG', false)
  },
  srs: {
    client: 'mysql',
    connection: {
      host: Env.get('DB_HOST', 'localhost'),
      port: Env.get('DB_PORT', ''),
      user: Env.get('DB_USER', 'root'),
      password: Env.get('DB_PASSWORD', ''),
      database: Env.get('DB_DATABASE_SRS', 'srs')
    },
    debug: Env.get('DB_DEBUG', false)
  },
  srs_56: {
    client: 'mysql',
    connection: {
      host: Env.get('DB_HOST_56', '192.168.0.56'),
      port: Env.get('DB_PORT_56', ''),
      user: Env.get('DB_USER_56', 'root'),
      password: Env.get('DB_PASSWORD_56', ''),
      database: Env.get('DB_DATABASE_56', 'srs')
    },
    debug: Env.get('DB_DEBUG', false)
  },
  srspos: {
    client: 'mssql',
    connection: {
      host: Env.get('DB_HOST_MS', '192.168.0.148'),
      port: Env.get('DB_PORT_MS', ''),
      user: Env.get('DB_USER_MS', 'markuser'),
      password: Env.get('DB_PASSWORD_MS', 'tseug'),
      database: Env.get('DB_DATABASE_SRSPOS', 'NOVA_JADE')
    },
    debug: Env.get('DB_DEBUG', false)
  },

  /*
  |--------------------------------------------------------------------------
  | PostgreSQL
  |--------------------------------------------------------------------------
  |
  | Here we define connection settings for PostgreSQL database.
  |
  | npm i --save pg
  |
  */
  pg: {
    client: 'pg',
    connection: {
      host: Env.get('DB_HOST', 'localhost'),
      port: Env.get('DB_PORT', ''),
      user: Env.get('DB_USER', 'root'),
      password: Env.get('DB_PASSWORD', ''),
      database: Env.get('DB_DATABASE', 'adonis')
    },
    debug: Env.get('DB_DEBUG', false)
  }
}
