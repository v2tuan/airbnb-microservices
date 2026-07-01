import { Kafka } from 'kafkajs'
import { env } from '~/config/environment'

const kafka = new Kafka({
  clientId: 'message-service',
  brokers: String(env.KAFKA_BROKERS)
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean)
})

let producer = null
let producerConnected = false

const getProducer = async () => {
  if (!producer) {
    producer = kafka.producer()
  }

  if (!producerConnected) {
    await producer.connect()
    producerConnected = true
  }

  return producer
}

export const publishNotificationEvent = async (event) => {
  const safeEvent = {
    ...event,
    occurredAt: event?.occurredAt || new Date().toISOString()
  }

  const kafkaProducer = await getProducer()
  await kafkaProducer.send({
    topic: env.KAFKA_NOTIFICATION_TOPIC,
    messages: [
      {
        key: safeEvent.recipientId ? String(safeEvent.recipientId) : undefined,
        value: JSON.stringify(safeEvent)
      }
    ]
  })
}

export const disconnectNotificationPublisher = async () => {
  if (producerConnected && producer) {
    await producer.disconnect()
  }

  producer = null
  producerConnected = false
}
