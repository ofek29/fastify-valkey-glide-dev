'use strict'

const whyIsNodeRunning = require('why-is-node-running')
const { test } = require('node:test')
const Fastify = require('fastify')
const fastifyValkey = require('..')

test.beforeEach(async () => {
  const fastify = Fastify()

  fastify.register(fastifyValkey, {
    addresses: [{ host: '127.0.0.1', port: 6379 }]
  })
  await fastify.ready()
  await fastify.valkey.flushall()
  await fastify.close()
})

test('fastify.valkey should exist', async (t) => {
  t.plan(1)
  const fastify = Fastify()
  fastify.register(fastifyValkey, {
    addresses: [{ host: '127.0.0.1' }]
  })

  await fastify.ready()
  t.assert.ok(fastify.valkey)

  await fastify.close()
})

test('fastify.valkey should be the valkey client', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  fastify.register(fastifyValkey, {
    addresses: [{ host: '127.0.0.1' }]
  })

  await fastify.ready()

  await fastify.valkey.set('key', 'value')
  const val = await fastify.valkey.get('key')
  t.assert.deepStrictEqual(val, 'value')

  await fastify.close()
})

test('fastify.valkey.test namespace should exist', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  fastify.register(fastifyValkey, {
    addresses: [{ host: '127.0.0.1' }],
    namespace: 'test'
  })

  await fastify.ready()

  t.assert.ok(fastify.valkey)
  t.assert.ok(fastify.valkey.test)

  await fastify.close()
})

test('fastify.valkey.test should be the valkey client', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  fastify.register(fastifyValkey, {
    addresses: [{ host: '127.0.0.1' }],
    namespace: 'test'
  })

  await fastify.ready()

  await fastify.valkey.test.set('key_namespace', 'value_namespace')
  const val = await fastify.valkey.test.get('key_namespace')
  t.assert.deepStrictEqual(val, 'value_namespace')

  await fastify.close()
})

test('Promises support', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  fastify.register(fastifyValkey, {
    addresses: [{ host: '127.0.0.1' }]
  })

  await fastify.ready()

  await fastify.valkey.set('key', 'value')
  const val = await fastify.valkey.get('key')
  t.assert.deepStrictEqual(val, 'value')

  await fastify.close()
})

test('Custom valkey client that is already connected', async (t) => {
  t.plan(3)
  const fastify = Fastify()
  const { GlideClient } = require('@valkey/valkey-glide')
  const valkey = await GlideClient.createClient({ addresses: [{ host: '127.0.0.1' }] })

  await valkey.set('key', 'value')
  const val = await valkey.get('key')
  t.assert.deepStrictEqual(val, 'value')

  fastify.register(fastifyValkey, {
    client: valkey,
  })

  await fastify.ready()

  t.assert.deepStrictEqual(fastify.valkey, valkey)

  await fastify.valkey.set('key2', 'value2')
  const val2 = await fastify.valkey.get('key2')
  t.assert.deepStrictEqual(val2, 'value2')

  fastify.valkey.close()
  await fastify.close()
})

test('If closeClient is enabled, close the client.', async (t) => {
  t.plan(4)
  const fastify = Fastify()
  const { GlideClient } = require('@valkey/valkey-glide')
  const valkey = await GlideClient.createClient({ addresses: [{ host: 'localhost', port: 6379 }] })

  await valkey.set('key', 'value')
  const val = await valkey.get('key')
  t.assert.deepStrictEqual(val, 'value')

  fastify.register(fastifyValkey, {
    client: valkey,
    closeClient: true
  })

  await fastify.ready()

  t.assert.deepStrictEqual(fastify.valkey, valkey)

  await fastify.valkey.set('key2', 'value2')
  const val2 = await fastify.valkey.get('key2')
  t.assert.deepStrictEqual(val2, 'value2')

  const originalClose = fastify.valkey.close
  fastify.valkey.close = (callback) => {
    t.assert.ok('valkey client closed')
    originalClose.call(fastify.valkey, callback)
  }

  await fastify.close()
})

test('If closeClient is enabled, close the client namespace.', async (t) => {
  t.plan(4)
  const fastify = Fastify()
  const { GlideClient } = require('@valkey/valkey-glide')
  const valkey = await GlideClient.createClient({ addresses: [{ host: 'localhost', port: 6379 }] })

  await valkey.set('key', 'value')
  const val = await valkey.get('key')
  t.assert.deepStrictEqual(val, 'value')

  fastify.register(fastifyValkey, {
    client: valkey,
    namespace: 'foo',
    closeClient: true
  })

  await fastify.ready()

  t.assert.deepStrictEqual(fastify.valkey.foo, valkey)

  await fastify.valkey.foo.set('key2', 'value2')
  const val2 = await fastify.valkey.foo.get('key2')
  t.assert.deepStrictEqual(val2, 'value2')

  const originalClose = fastify.valkey.foo.close
  fastify.valkey.foo.close = (callback) => {
    t.assert.ok('valkey client closed')
    originalClose.call(fastify.valkey.foo, callback)
  }

  await fastify.close()
})

test('fastify.valkey.test should throw with duplicate connection namespaces', async (t) => {
  t.plan(1)

  const namespace = 'test'

  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify
    .register(fastifyValkey, {
      addresses: [{ host: '127.0.0.1' }],
      namespace
    })
    .register(fastifyValkey, {
      addresses: [{ host: '127.0.0.1' }],
      namespace
    })

  await t.assert.rejects(fastify.ready(), new Error(`Valkey '${namespace}' instance namespace has already been registered`))
})

test('Should throw when trying to register multiple instances without giving a namespace', async (t) => {
  t.plan(1)

  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify
    .register(fastifyValkey, {
      addresses: [{ host: '127.0.0.1' }],
    })
    .register(fastifyValkey, {
      addresses: [{ host: '127.0.0.1' }],
    })

  await t.assert.rejects(fastify.ready(), new Error('@fastify/valkey has already been registered'))
})

test('Should not throw within different contexts', async (t) => {
  t.plan(1)

  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.register(function (instance, _options, next) {
    instance.register(fastifyValkey, {
      addresses: [{ host: '127.0.0.1' }]
    })
    next()
  })

  fastify.register(function (instance, _options, next) {
    instance
      .register(fastifyValkey, {
        addresses: [{ host: '127.0.0.1' }],
        namespace: 'test1'
      })
      .register(fastifyValkey, {
        addresses: [{ host: '127.0.0.1' }],
        namespace: 'test2'
      })
    next()
  })

  await fastify.ready()
  t.assert.ok(fastify)
})

test('Should throw when trying to connect on an invalid host', async (t) => {
  t.plan(1)

  const fastify = Fastify({ pluginTimeout: 20000 })
  t.after(() => fastify.close())

  fastify.register(fastifyValkey, {
    addresses: [{ host: 'invalid_host' }],
    connectionBackoff: {
      numberOfRetries: 0
    }
  })

  await t.assert.rejects(fastify.ready())
})

test('Should be able to register multiple namespaced @fastify/valkey instances', async t => {
  t.plan(3)

  const fastify = Fastify()
  t.after(() => fastify.close())

  await fastify.register(fastifyValkey, {
    addresses: [{ host: '127.0.0.1' }],
    namespace: 'one'
  })

  await fastify.register(fastifyValkey, {
    addresses: [{ host: '127.0.0.1' }],
    namespace: 'two'
  })

  await fastify.ready()
  t.assert.ok(fastify.valkey)
  t.assert.ok(fastify.valkey.one)
  t.assert.ok(fastify.valkey.two)
})

test('Should throw when @fastify/valkey is initialized with an option that makes valkey throw', async (t) => {
  t.plan(1)

  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.register(fastifyValkey, { addresses: [] })

  await t.assert.rejects(fastify.ready())
})

test('Should throw when @fastify/valkey is initialized with a namespace and an option that makes valkey throw', async (t) => {
  t.plan(1)

  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.register(fastifyValkey, {
    addresses: [],
    namespace: 'fail'
  })

  await t.assert.rejects(fastify.ready())
})

setInterval(() => {
  whyIsNodeRunning()
}, 5000).unref()
