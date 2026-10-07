"""Teléfono de contacto de la orden: 10 dígitos nacionales.

México, Estados Unidos y Canadá usan números de 10 dígitos, así que el mismo
tope sirve para los tres. Si llega con lada de país (+52, +52 1, +1) o con
separadores, se queda solo el número nacional.
"""
import re

TELEFONO_MAX = 10


def normalizar_telefono(value) -> str:
    """Solo dígitos, sin lada de país. No recorta: quien llama valida el largo."""
    digits = re.sub(r'\D', '', str(value or ''))
    if len(digits) == 13 and digits.startswith('521'):
        return digits[3:]
    if len(digits) == 12 and digits.startswith('52'):
        return digits[2:]
    # Ningún número nacional de MX/EE. UU./Canadá empieza con 1: es la lada +1.
    if len(digits) == 11 and digits.startswith('1'):
        return digits[1:]
    return digits
