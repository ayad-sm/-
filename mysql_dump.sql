-- If you need to import the DB again, run this file in MySQL Workbench.
-- (Same as previously provided export)
DROP DATABASE IF EXISTS mobile_tariffs;
CREATE DATABASE mobile_tariffs CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mobile_tariffs;

DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS service_types;
DROP TABLE IF EXISTS tariffs;

CREATE TABLE tariffs (
  id        CHAR(36) NOT NULL,
  name      VARCHAR(200) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE service_types (
  id        CHAR(36) NOT NULL,
  name      VARCHAR(200) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_service_types_name (name)
) ENGINE=InnoDB;

CREATE TABLE services (
  id        CHAR(36) NOT NULL,
  value     DOUBLE NOT NULL,
  unit      VARCHAR(50) NOT NULL,
  tariffId  CHAR(36) NOT NULL,
  typeId    CHAR(36) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_services_tariff_type (tariffId, typeId),
  KEY idx_services_tariffId (tariffId),
  KEY idx_services_typeId (typeId),
  CONSTRAINT fk_services_tariff FOREIGN KEY (tariffId) REFERENCES tariffs(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_services_type FOREIGN KEY (typeId) REFERENCES service_types(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

SET @type_internet = UUID();   INSERT INTO service_types (id, name) VALUES (@type_internet, 'Интернет');
SET @type_calls = UUID();      INSERT INTO service_types (id, name) VALUES (@type_calls, 'Звонки');
SET @type_sms = UUID();        INSERT INTO service_types (id, name) VALUES (@type_sms, 'SMS');
SET @type_roaming = UUID();    INSERT INTO service_types (id, name) VALUES (@type_roaming, 'Роуминг');
SET @type_mess = UUID();       INSERT INTO service_types (id, name) VALUES (@type_mess, 'Безлимит на мессенджеры');
SET @type_soc = UUID();        INSERT INTO service_types (id, name) VALUES (@type_soc, 'Безлимит на соцсети');
SET @type_teth = UUID();       INSERT INTO service_types (id, name) VALUES (@type_teth, 'Раздача интернета');
SET @type_tv = UUID();         INSERT INTO service_types (id, name) VALUES (@type_tv, 'ТВ-пакет');

SET @tariff_start = UUID();    INSERT INTO tariffs (id, name) VALUES (@tariff_start, 'Старт');
SET @tariff_balance = UUID();  INSERT INTO tariffs (id, name) VALUES (@tariff_balance, 'Баланс');
SET @tariff_online = UUID();   INSERT INTO tariffs (id, name) VALUES (@tariff_online, 'Онлайн');
SET @tariff_family = UUID();   INSERT INTO tariffs (id, name) VALUES (@tariff_family, 'Семейный');
SET @tariff_premium = UUID();  INSERT INTO tariffs (id, name) VALUES (@tariff_premium, 'Премиум');

INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_start, @type_internet, 10, 'ГБ');
INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_start, @type_calls, 200, 'мин');
INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_start, @type_sms, 50, 'шт');

INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_balance, @type_internet, 20, 'ГБ');
INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_balance, @type_calls, 400, 'мин');
INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_balance, @type_sms, 100, 'шт');
INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_balance, @type_teth, 5, 'ГБ');

INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_online, @type_internet, 35, 'ГБ');
INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_online, @type_mess, 1, 'вкл');
INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_online, @type_soc, 1, 'вкл');
INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_online, @type_calls, 300, 'мин');

INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_family, @type_internet, 50, 'ГБ');
INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_family, @type_calls, 800, 'мин');
INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_family, @type_teth, 15, 'ГБ');
INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_family, @type_tv, 1, 'вкл');

INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_premium, @type_internet, 100, 'ГБ');
INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_premium, @type_calls, 2000, 'мин');
INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_premium, @type_sms, 300, 'шт');
INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_premium, @type_roaming, 30, 'дней');
INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_premium, @type_tv, 1, 'вкл');
INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_premium, @type_mess, 1, 'вкл');
INSERT INTO services (id, tariffId, typeId, value, unit) VALUES (UUID(), @tariff_premium, @type_soc, 1, 'вкл');
