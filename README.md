# @fastify/valkey-glide

Fastify Valkey connection plugin, with this you can share the same Valkey connection in every part of your server.

Using [`@valkey/valkey-glide`](https://github.com/valkey-io/valkey-glide) client under the hood.

### Compatibility
| Plugin version | Fastify version |
| ---------------|-----------------|
|      `1.x`     |      `^5.x`     |

For Valkey and Redis DB compatibility look [here](https://github.com/valkey-io/valkey-glide?tab=readme-ov-file#supported-engine-versions)

## Usage

Add it to your project with `register` and you are done!

### Create a new Valkey Client

The ``options`` that you pass to `register` will be passed to the Valkey client.

```js
const fastify = require('fastify')()

// create by specifying address
fastify.register(require('@fastify/valkey-glide'), {
  addresses: [{ host: '127.0.0.1' }]
})

// OR with more options
fastify.register(require('@fastify/valkey-glide'), {
  addresses: [{ host: '127.0.0.1', port: 6379 }],
  credentials: {username: "user1", password: "password"},
  useTLS: true
})
```

### Accessing the Valkey Client

Once you have registered your plugin, you can access the Valkey client via `fastify.valkey`.

The client is automatically closed when the fastify instance is closed.

```js
'use strict'

const Fastify = require('fastify')
const fastifyValkey = require('@fastify/valkey-glide')

const fastify = Fastify({ logger: true })

fastify.register(fastifyValkey, {
  addresses: [{ host: '127.0.0.1', port: 6379 }],
})

fastify.post('/foo', (req, reply) => {
  fastify.valkey.set(req.body.key, req.body.value, (err) => {
    reply.send(err || { status: 'ok' })
  })
})

fastify.get('/foo', (req, reply) => {
  const { valkey } = fastify
  fastify.valkey.get(req.query.key, (err, val) => {
    reply.send(err || val)
  })
})

fastify.listen({ port: 3000 }, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```

### Using an existing Valkey client

You may also supply an existing *Valkey* client instance by passing an options
object with the `client` property set to the instance. In this case,
the client is not automatically closed when the Fastify instance is
closed.

```js
'use strict'

const fastify = require('fastify')()
const { GlideClient } = require('@valkey/valkey-glide')

const client = await GlideClient.createClient({
  addresses: [{ host: 'localhost', port: 6379 }]
})

fastify.register(require('@fastify/valkey-glide'), { client })
```

You can also supply a *Valkey Cluster* instance to the client:

```js
'use strict'

const fastify = require('fastify')()
const { GlideClusterClient } = require('@valkey/valkey-glide')

const client = await GlideClusterClient.createClient({
  addresses: [{ host: '127.0.0.1', port: 6379 }]
})

fastify.register(require('@fastify/valkey-glide'), { client })
```

Note: by default, *@fastify/valkey-glide* will **not** automatically close the client
connection when the Fastify server shuts down.

To automatically close the client connection, set clientClose to true.

```js
fastify.register(require('@fastify/valkey-glide'), { 
    client, 
    closeClient: true })
```

## Registering multiple Valkey client instances

By using the `namespace` option you can register multiple Valkey client instances.

```js
'use strict'

const fastify = require('fastify')()
const { GlideClient } = require('@valkey/valkey-glide')

const valkey = await GlideClient.createClient({
  addresses: [{ host: 'localhost', port: 6379 }]
})

fastify
  .register(require('@fastify/valkey-glide'), {
    addresses: [{ host: '127.0.0.1', port: 6380 }],
    namespace: 'hello'
  })
  .register(require('@fastify/valkey-glide'), {
    client: valkey,
    namespace: 'world'
  })

// Here we will use the `hello` named instance
fastify.post('/hello', (req, reply) => {
  const { valkey } = fastify

  valkey['hello'].set(req.body.key, req.body.value, (err) => {
    reply.send(err || { status: 'ok' })
  })
})

fastify.get('/hello', (req, reply) => {
  const { valkey } = fastify

  valkey.hello.get(req.query.key, (err, val) => {
    reply.send(err || val)
  })
})

// Here we will use the `world` named instance
fastify.post('/world', (req, reply) => {
  const { valkey } = fastify

  valkey.world.set(req.body.key, req.body.value, (err) => {
    reply.send(err || { status: 'ok' })
  })
})

fastify.get('/world', (req, reply) => {
  const { valkey } = fastify

  valkey['world'].get(req.query.key, (err, val) => {
    reply.send(err || val)
  })
})

fastify.listen({ port: 3000 }, function (err) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
```

## License

Licensed under [MIT](./LICENSE).
