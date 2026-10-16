-- Add a direct, optional link from each section to its teacher guide.
ALTER TABLE secciones
    ADD COLUMN dui_docente_guia VARCHAR(10) NULL AFTER id_especialidad,
    ADD KEY idx_secciones_docente_guia (dui_docente_guia),
    ADD CONSTRAINT fk_secciones_docente_guia
        FOREIGN KEY (dui_docente_guia) REFERENCES docente (dui_docente)
        ON UPDATE CASCADE
        ON DELETE SET NULL;

-- Retain old subject-assignment data as inactive history when removing the
-- legacy docentes and materias_docente tables. Populate this table before
-- dropping those legacy tables.
CREATE TABLE asignacion_docente_legacy_archive (
    id_asignacion_legacy INT NOT NULL,
    nombre_docente_legacy VARCHAR(100) NOT NULL,
    dui_docente VARCHAR(10) NOT NULL,
    seccion_legacy VARCHAR(50) NOT NULL,
    materia_legacy VARCHAR(100) NOT NULL,
    archivado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_asignacion_legacy),
    KEY idx_asignacion_docente_legacy_dui (dui_docente),
    CONSTRAINT fk_asignacion_docente_legacy_docente
        FOREIGN KEY (dui_docente) REFERENCES docente (dui_docente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
