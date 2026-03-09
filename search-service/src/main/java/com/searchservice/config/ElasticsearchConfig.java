package com.searchservice.config;

import org.springframework.data.elasticsearch.repository.config.EnableElasticsearchRepositories;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableElasticsearchRepositories(basePackages = "com.searchservice.repository")
public class ElasticsearchConfig {
}