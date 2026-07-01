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

  consumer = kafka.consumer({ groupId: 'message-service-notification-realtime-group' })
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
}

export const stopNotificationRealtimeConsumer = async () => {
  if (consumer) {
    await consumer.disconnect()
  }

  consumer = null
  running = false
}
