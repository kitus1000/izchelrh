export function getOrdinalJuridico(number: number): string {
    const ordinales: { [key: number]: string } = {
        1: 'PRIMERA', 2: 'SEGUNDA', 3: 'TERCERA', 4: 'CUARTA', 5: 'QUINTA',
        6: 'SEXTA', 7: 'SÉPTIMA', 8: 'OCTAVA', 9: 'NOVENA', 10: 'DÉCIMA',
        11: 'DÉCIMA PRIMERA', 12: 'DÉCIMA SEGUNDA', 13: 'DÉCIMA TERCERA', 14: 'DÉCIMA CUARTA', 15: 'DÉCIMA QUINTA',
        16: 'DÉCIMA SEXTA', 17: 'DÉCIMA SÉPTIMA', 18: 'DÉCIMA OCTAVA', 19: 'DÉCIMA NOVENA', 20: 'VIGÉSIMA',
        21: 'VIGÉSIMA PRIMERA', 22: 'VIGÉSIMA SEGUNDA', 23: 'VIGÉSIMA TERCERA', 24: 'VIGÉSIMA CUARTA', 25: 'VIGÉSIMA QUINTA',
        26: 'VIGÉSIMA SEXTA', 27: 'VIGÉSIMA SÉPTIMA', 28: 'VIGÉSIMA OCTAVA', 29: 'VIGÉSIMA NOVENA', 30: 'TRIGÉSIMA',
        31: 'TRIGÉSIMA PRIMERA', 32: 'TRIGÉSIMA SEGUNDA', 33: 'TRIGÉSIMA TERCERA', 34: 'TRIGÉSIMA CUARTA', 35: 'TRIGÉSIMA QUINTA',
    };
    return ordinales[number] || `CLÁUSULA ${number}`;
}

export function numeroALetras(monto: number): string {
    const Unidades = (num: number) => {
        switch (num) {
            case 1: return "UN";
            case 2: return "DOS";
            case 3: return "TRES";
            case 4: return "CUATRO";
            case 5: return "CINCO";
            case 6: return "SEIS";
            case 7: return "SIETE";
            case 8: return "OCHO";
            case 9: return "NUEVE";
            default: return "";
        }
    };

    const Decenas = (num: number) => {
        const decena = Math.floor(num / 10);
        const unidad = num - (decena * 10);
        switch (decena) {
            case 1:
                switch (unidad) {
                    case 0: return "DIEZ";
                    case 1: return "ONCE";
                    case 2: return "DOCE";
                    case 3: return "TRECE";
                    case 4: return "CATORCE";
                    case 5: return "QUINCE";
                    default: return "DIECI" + Unidades(unidad);
                }
            case 2:
                switch (unidad) {
                    case 0: return "VEINTE";
                    default: return "VEINTI" + Unidades(unidad);
                }
            case 3: return DecenasY("TREINTA", unidad);
            case 4: return DecenasY("CUARENTA", unidad);
            case 5: return DecenasY("CINCUENTA", unidad);
            case 6: return DecenasY("SESENTA", unidad);
            case 7: return DecenasY("SETENTA", unidad);
            case 8: return DecenasY("OCHENTA", unidad);
            case 9: return DecenasY("NOVENTA", unidad);
            case 0: return Unidades(unidad);
            default: return "";
        }
    };

    const DecenasY = (strSin: string, numUnidades: number) => {
        if (numUnidades > 0) return strSin + " Y " + Unidades(numUnidades);
        return strSin;
    };

    const Centenas = (num: number) => {
        const centenas = Math.floor(num / 100);
        const decenas = num - (centenas * 100);
        switch (centenas) {
            case 1:
                if (decenas > 0) return "CIENTO " + Decenas(decenas);
                return "CIEN";
            case 2: return "DOSCIENTOS " + Decenas(decenas);
            case 3: return "TRESCIENTOS " + Decenas(decenas);
            case 4: return "CUATROCIENTOS " + Decenas(decenas);
            case 5: return "QUINIENTOS " + Decenas(decenas);
            case 6: return "SEISCIENTOS " + Decenas(decenas);
            case 7: return "SETECIENTOS " + Decenas(decenas);
            case 8: return "OCHOCIENTOS " + Decenas(decenas);
            case 9: return "NOVECIENTOS " + Decenas(decenas);
            default: return Decenas(decenas);
        }
    };

    const Seccion = (num: number, divisor: number, strSingular: string, strPlural: string) => {
        const cientos = Math.floor(num / divisor);
        const resto = num - (cientos * divisor);
        let letras = "";
        if (cientos > 0) {
            if (cientos > 1) {
                letras = Centenas(cientos) + " " + strPlural;
            } else {
                letras = strSingular;
            }
        }
        if (resto > 0) {
            letras += "";
        }
        return letras;
    };

    const Miles = (num: number) => {
        const divisor = 1000;
        const cientos = Math.floor(num / divisor);
        const resto = num - (cientos * divisor);
        const strMiles = Seccion(num, divisor, "UN MIL", "MIL");
        const strCentenas = Centenas(resto);
        if (strMiles === "") return strCentenas;
        return strMiles + " " + strCentenas;
    };

    const Millones = (num: number) => {
        const divisor = 1000000;
        const cientos = Math.floor(num / divisor);
        const resto = num - (cientos * divisor);
        const strMillones = Seccion(num, divisor, "UN MILLON", "MILLONES");
        const strMiles = Miles(resto);
        if (strMillones === "") return strMiles;
        return strMillones + " " + strMiles;
    };

    return Millones(monto).trim() || "CERO";
}
