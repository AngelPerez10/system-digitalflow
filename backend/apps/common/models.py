from django.db import IntegrityError, models

DEFAULT_NOMBRE = "Grupo Intrax"


class MarcaSistema(models.Model):
    """Ficha única de marca (nombre + logo) para toda la empresa."""

    SINGLETON_PK = 1

    nombre = models.CharField(max_length=120, default=DEFAULT_NOMBRE)
    logo_url = models.TextField(blank=True, default="")
    logo_public_id = models.CharField(max_length=255, blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Marca del sistema"
        verbose_name_plural = "Marca del sistema"

    def save(self, *args, **kwargs):
        self.pk = self.SINGLETON_PK
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls) -> "MarcaSistema":
        existing = cls.objects.filter(pk=cls.SINGLETON_PK).first()
        if existing is not None:
            return existing
        try:
            return cls.objects.create(pk=cls.SINGLETON_PK, nombre=DEFAULT_NOMBRE)
        except IntegrityError:
            return cls.objects.get(pk=cls.SINGLETON_PK)

    def __str__(self) -> str:
        return self.nombre
