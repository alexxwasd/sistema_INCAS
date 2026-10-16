-- Aplicar una sola vez despues de respaldar la base de datos.
-- Conserva la especialidad elegida al convertir una solicitud tecnica en perfil de alumno.
ALTER TABLE `alumno`
    ADD COLUMN `id_especialidad` int(11) DEFAULT NULL AFTER `tipo_bachillerato`,
    ADD KEY `fk_alumno_especialidad` (`id_especialidad`),
    ADD CONSTRAINT `fk_alumno_especialidad`
        FOREIGN KEY (`id_especialidad`)
        REFERENCES `especialidades` (`id_especialidad`)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;
