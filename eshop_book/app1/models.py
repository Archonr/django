from django.db import models
from django.contrib.auth.models import User
from tinymce.models import HTMLField
# Create your models here.

class Book(models.Model):
    title = models.CharField(max_length=255)
    price = models.FloatField()
    description = models.TextField(max_length=1000)

    def __str__(self):
        return '{} {} $'.format(self.title, self.price)

class Project(models.Model):
    def __unicode__(self):
        return self.name

    @staticmethod
    def admin_list_display():
        return "id", "name", "parent", "description"

    name = models.CharField(max_length=256)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE)
    description = models.TextField(null=True, blank=True)
    users = models.ManyToManyField(User)

