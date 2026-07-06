import { Kafka } from 'kafkajs'
import { env } from '~/config/environment'

const kafka = new Kafka({
  clientId: 'message-service-notification-realtime',
  brokers: String(env.KAFKA_BROKERS)
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean)
})

let consumer = null
let running = false
let startPromise = null

const parseEvent = (value) => {
  if (!value) return null

  try {
    return JSON.parse(value.toString('utf8'))
  } catch {
    return null
  }
}

export const startNotificationRealtimeConsumer = async (io) => {
  if (running) return
  if (startPromise) return startPromise

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  startPromise = (async () => {
    let attempt = 0

    while (!running) {
      try {
        consumer = kafka.consumer({ groupId: 'message-service-notification-realtime-group-v2' })
        await consumer.connect()
        await consumer.subscribe({ topic: env.KAFKA_NOTIFICATION_TOPIC, fromBeginning: false })

        await consumer.run({
          eachMessage: async ({ message }) => {
            const event = parseEvent(message.value)
            if (!event?.recipientId) return

            io.to(`user:${String(event.recipientId)}`).emit('notification:new', event)
          }
        })

        running = true
        attempt = 0
      } catch (error) {
        console.error('Failed to start notification realtime consumer', error)

        if (consumer) {
          try {
            await consumer.disconnect()
          } catch {
            // ignore disconnect errors during retry
          }
        }

        consumer = null
        running = false
        attempt += 1

        const delayMs = Math.min(30000, 1000 * 2 ** Math.min(attempt, 5))
        await sleep(delayMs)
      }
    }
  })().finally(() => {
    startPromise = null
  })

  return startPromise
}

export const stopNotificationRealtimeConsumer = async () => {
  if (consumer) {
    await consumer.disconnect()
  }

  consumer = null
  running = false
  startPromise = null
}
