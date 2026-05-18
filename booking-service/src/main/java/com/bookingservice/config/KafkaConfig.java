package com.bookingservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.listener.ContainerProperties;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class KafkaConfig {
    // Cấu hình error handler cho Kafka consumer
    // Thay vì để message bị stuck khi lỗi, retry có giới hạn rồi gửi vào Dead Letter Topic
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object>
    kafkaListenerContainerFactory(ConsumerFactory<String, Object> consumerFactory) {

        ConcurrentKafkaListenerContainerFactory<String, Object> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);

        // MANUAL_IMMEDIATE: Spring sẽ commit offset sau khi listener return (không throw)
        // Nếu listener throw → không commit → Kafka sẽ re-deliver message sau
        factory.getContainerProperties().setAckMode(
                ContainerProperties.AckMode.MANUAL_IMMEDIATE
        );

        // Retry 3 lần, cách nhau 1 giây
        // Sau 3 lần fail → gửi message vào Dead Letter Topic (.DLT suffix)
        factory.setCommonErrorHandler(
                new DefaultErrorHandler(new FixedBackOff(1000L, 3))
        );

        return factory;
    }
}
