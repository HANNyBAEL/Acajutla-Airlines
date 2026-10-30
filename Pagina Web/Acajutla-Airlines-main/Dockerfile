FROM php:8.2-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends libcurl4-openssl-dev \
    && docker-php-ext-install curl mysqli \
    && rm -rf /var/lib/apt/lists/*

COPY . /var/www/html/

RUN a2enmod rewrite \
    && usermod -a -G 1000 www-data \
    && sed -i 's/Listen 80/Listen 10000/' /etc/apache2/ports.conf \
    && sed -i 's#<VirtualHost \*:80>#<VirtualHost *:10000>#' /etc/apache2/sites-available/000-default.conf \
    && echo "ServerName localhost" >> /etc/apache2/apache2.conf

EXPOSE 10000
