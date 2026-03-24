package com.wishlistservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class WishlistServiceApplication {

  public static void main(String[] args) {
    SpringApplication.run(WishlistServiceApplication.class, args);
  }

}
