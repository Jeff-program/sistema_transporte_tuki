package com.tuki.sistema.config;

import org.apache.coyote.http11.Http11Nio2Protocol;
import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TomcatConfig {

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> tomcatProtocolCustomizer() {
        return factory -> factory.setProtocol(Http11Nio2Protocol.class.getName());
    }
}
