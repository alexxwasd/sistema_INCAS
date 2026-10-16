-- Aplicar una sola vez sobre db_matricula_incas despues de respaldar la base.
-- Las solicitudes pendientes aun no tienen NIE ni seccion asignados; se completan al aprobar.
-- Esta migracion agrega los campos del formulario y permite dejar NIE y seccion vacios.
ALTER TABLE `matriculas`
    MODIFY COLUMN `nie` varchar(20) DEFAULT NULL,
    MODIFY COLUMN `grado_seccion` varchar(100) DEFAULT NULL,
    ADD COLUMN `fecha_nac_est` date DEFAULT NULL AFTER `apellido_est`,
    ADD COLUMN `apellido_rep` varchar(100) DEFAULT NULL AFTER `nombre_rep`,
    ADD COLUMN `telefono_rep` varchar(20) DEFAULT NULL AFTER `dui_rep`,
    ADD COLUMN `direccion_est` text DEFAULT NULL AFTER `correo_est`,
    ADD COLUMN `tipo_bachillerato` enum('General', 'Técnico') DEFAULT NULL AFTER `direccion_est`,
    ADD COLUMN `id_especialidad` int(11) DEFAULT NULL AFTER `tipo_bachillerato`,
    ADD KEY `fk_matriculas_especialidad` (`id_especialidad`),
    ADD CONSTRAINT `fk_matriculas_especialidad`
        FOREIGN KEY (`id_especialidad`)
        REFERENCES `especialidades` (`id_especialidad`)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;
