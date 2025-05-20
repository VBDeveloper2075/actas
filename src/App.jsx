import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabase";

function App() {
  const { toast } = useToast();
  const [docentes, setDocentes] = useState({});
  const [formData, setFormData] = useState({
    nombreApellido: "",
    nombreEscuela: "",
    fechaActa: "",
    dni: "",
    expediente: "",
    resolucion: "",
    textoAdicional: "",
  });

  useEffect(() => {
    fetchDocentes();
  }, []);

  const fetchDocentes = async () => {
    try {
      const { data, error } = await supabase.from("docentes").select("*");

      if (error) throw error;

      const docentesMap = {};
      data.forEach((docente) => {
        docentesMap[docente.nombre_apellido] = {
          nombreEscuela: docente.nombre_escuela,
          dni: docente.dni,
          expediente: docente.expediente,
          resolucion: docente.resolucion,
          textoAdicional: docente.texto_adicional,
        };
      });

      setDocentes(docentesMap);
    } catch (error) {
      console.error("Error fetching docentes:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de los docentes",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "nombreApellido") {
      const nombres = value.split(";").map((n) => n.trim());
      const ultimoNombre = nombres[nombres.length - 1];

      try {
        const { data, error } = await supabase
          .from("docentes")
          .select("*")
          .eq("nombre_apellido", ultimoNombre)
          .single();

        if (error) throw error;

        if (data) {
          setFormData((prev) => ({
            ...prev,
            nombreEscuela: data.nombre_escuela,
            dni: data.dni,
            expediente: data.expediente,
            resolucion: data.resolucion,
            textoAdicional: data.texto_adicional || "",
            nombreApellido: value,
          }));

          toast({
            title: "Datos encontrados",
            description: "Se han completado los campos automáticamente",
          });
        }
      } catch (error) {
        console.error("Error fetching docente:", error);
      }
    }
  };

  const generatePDF = async () => {
    const nombres = formData.nombreApellido.split(";").map((n) => n.trim());

    if (nombres.length === 0) {
      toast({
        title: "Error",
        description: "Por favor ingrese al menos un nombre",
        variant: "destructive",
      });
      return;
    }

    try {
      for (const nombre of nombres) {
        const { data, error } = await supabase
          .from("docentes")
          .select("*")
          .eq("nombre_apellido", nombre)
          .single();

        if (error) {
          toast({
            title: "Error",
            description: `No se encontraron datos para ${nombre}`,
            variant: "destructive",
          });
          continue;
        }

        const doc = new jsPDF();

        // Configurar fuente Arial por defecto para todo el documento
        doc.setFont("arial");
        doc.setFontSize(12);
        doc.setLineHeightFactor(1.5);

        // Agrego logo arriba
        const logoPath = "public/assets/secretariaLogo.png";
        const logoWidth = 150;
        const logoHeight = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(logoPath, "PNG", logoX, 20, logoWidth, logoHeight);

        const encabezado1 =
          "ACTA N°             /2025 - NOTIFICACIÓN de EXPEDIENTE";
        const encabezado2 = "- MAD Y ACRECENTAMIENTO 2021-2022 ED. FÍSICA -";

        // Encabezados
        doc.setFont("arial");
        doc.setFontSize(12);
        const textWidth1 =
          (doc.getStringUnitWidth(encabezado1) * doc.getFontSize()) /
          doc.internal.scaleFactor;
        const xPos1 = (doc.internal.pageSize.getWidth() - textWidth1) / 2;
        doc.text(encabezado1, xPos1, 55);

        // Subrayar la primera línea
        // doc.setLineWidth(0.5);
        doc.line(xPos1, 57, xPos1 + textWidth1, 57);

        doc.setFont("arial", "normal");
        const textWidth2 =
          (doc.getStringUnitWidth(encabezado2) * doc.getFontSize()) /
          doc.internal.scaleFactor;
        const xPos2 = (doc.internal.pageSize.getWidth() - textWidth2) / 2;
        doc.text(encabezado2, xPos2, 65);

        doc.setFontSize(11);

        const contenido = `En Caseros, a los ....... días de ${formData.fechaActa} de 2025, siendo las ..............hs, se presenta en Secretaría de Asuntos Docentes de Tres de Febrero, sita en A. Ferreyra 2631 Caseros, el/la docente ${data.nombre_apellido} DNI ${data.dni}, para notificarse sobre ${data.expediente}, y su ${data.resolucion}, donde ${data.texto_adicional} en la ${data.nombre_escuela} del distrito de Tres de Febrero.`;

        const notificacion =
          "El/la docente firma en autos y se envía al correo electrónico oficial declarado -@abc.gob.ar-, copia de la Resolución.";

        const splitContent = doc.splitTextToSize(contenido, 160);
        doc.text(splitContent, 25, 85);

        const splitNotification = doc.splitTextToSize(notificacion, 160);
        doc.text(splitNotification, 25, 130);

        doc.text("FIRMA:", 25, 170);
        doc.text("ACLARACIÓN:", 25, 185);
        doc.text("DNI:", 25, 200);
        doc.text("LUGAR Y FECHA:", 25, 215);
        doc.text("DOMICILIO CONSTITUIDO:", 25, 230);
        doc.text("CELULAR:", 25, 245);
        doc.text("CORREO ABC:", 25, 260);

        const nombreArchivo = `acta-notificacion-${data.nombre_apellido
          .toLowerCase()
          .replace(/\s+/g, "-")}.pdf`;
        doc.save(nombreArchivo);
      }

      toast({
        title: "¡Éxito!",
        description: `Se han generado ${nombres.length} documento(s) PDF correctamente`,
      });
    } catch (error) {
      console.error("Error generando PDF:", error);
      toast({
        title: "Error",
        description: "Hubo un problema al generar el PDF",
        variant: "destructive",
      });
    }
  };

  const handleSaveDocente = async () => {
    try {
      const nombres = formData.nombreApellido.split(";");

      for (const nombre of nombres) {
        const { error } = await supabase.from("docentes").upsert({
          nombre_apellido: nombre.trim(),
          dni: formData.dni,
          nombre_escuela: formData.nombreEscuela,
          expediente: formData.expediente,
          resolucion: formData.resolucion,
          texto_adicional: formData.textoAdicional,
        });

        if (error) throw error;
      }

      toast({
        title: "¡Éxito!",
        description: "Datos guardados correctamente",
      });

      fetchDocentes();
    } catch (error) {
      console.error("Error saving docente:", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los datos",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-800">
          Generador de Acta de Notificación
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="nombreApellido">
              Nombre y Apellido del docente (separar múltiples con punto y coma)
            </Label>
            <Input
              id="nombreApellido"
              name="nombreApellido"
              value={formData.nombreApellido}
              onChange={handleInputChange}
              placeholder="Ej: Juan Pérez; María García"
              list="docentes"
            />
            <datalist id="docentes">
              {Object.keys(docentes).map((nombre) => (
                <option key={nombre} value={nombre} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombreEscuela">Nombre de la Escuela</Label>
            <Input
              id="nombreEscuela"
              name="nombreEscuela"
              value={formData.nombreEscuela}
              onChange={handleInputChange}
              placeholder="Ingrese nombre de la escuela"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaActa">Fecha del acta</Label>
            <Input
              id="fechaActa"
              name="fechaActa"
              value={formData.fechaActa}
              onChange={handleInputChange}
              placeholder="Ejemplo: Abril"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dni">DNI</Label>
            <Input
              id="dni"
              name="dni"
              value={formData.dni}
              onChange={handleInputChange}
              placeholder="Ingrese DNI"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expediente">Expediente</Label>
            <Input
              id="expediente"
              name="expediente"
              value={formData.expediente}
              onChange={handleInputChange}
              placeholder="Ingrese número de expediente"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolucion">Resolución</Label>
            <Input
              id="resolucion"
              name="resolucion"
              value={formData.resolucion}
              onChange={handleInputChange}
              placeholder="Ingrese número de resolución"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="textoAdicional">Texto adicional</Label>
            <Input
              id="textoAdicional"
              name="textoAdicional"
              value={formData.textoAdicional}
              onChange={handleInputChange}
              placeholder="Ingrese texto adicional"
            />
          </div>

          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <Button
              onClick={handleSaveDocente}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Guardar Datos
            </Button>
            <Button
              onClick={generatePDF}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Generar PDF
            </Button>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

export default App;
