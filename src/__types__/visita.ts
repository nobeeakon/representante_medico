type ProductoInformation = {
  productoId: string;
  cantidad: string;
};


export type VisitaStatus = 'planeado' | 'visitado' | 'noEncontrado';
export type VisitaEntidadObjetivo = 'medico' | 'farmacia';


export type Visita = {
  id: string;
  createdAt: Date;
  fechaVisita: Date;
  /** @deprecated Only kept for backward compatibility. Use fechaVisita instead. */
  fechaVisitaPlaneada: string;
  entidadObjetivoTipo: VisitaEntidadObjetivo;
  entidadObjetivoId: string;
  estatus: VisitaStatus;
  etiquetasIds?: string[];
  nota?: string;
  productoJson: ProductoInformation[];
  productoSolicitadoJson?: ProductoInformation[];
  productoDejadoJson?: ProductoInformation[];
};
